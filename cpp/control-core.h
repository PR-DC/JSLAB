// JSLAB - control-core.h
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// --------------------

#ifndef JSLAB_CONTROL_CORE_H
#define JSLAB_CONTROL_CORE_H

#include <Eigen/Dense>
#include <unsupported/Eigen/MatrixFunctions>

namespace control_core {
using Matrix = Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;
using Input = Eigen::Map<const Matrix>;
using Output = Eigen::Map<Matrix>;

class Identification {
 public:
  static bool fit(const double* input, const double* output, const double* initial,
      int samples, int poles, int zeros, double duration, bool use_initial, bool foh, double* result);
};

class Interconnections {
 public:
  static bool connect(const double* first, const double* second, int n1, int n2,
      int inputs, int intermediate, int outputs, int mode, double factor, double* result);
};

class Design {
 public:
  static bool place(const double* a, const double* b, const double* coefficients, int n, int m, double* out);
  static bool lqr(const double* a, const double* b, const double* q, const double* r, const double* s,
      int n, int m, bool discrete, double* out);
};

class Models {
 public:
  // The final block is the input slope for first-order hold.
  static bool discretize(const double* a, const double* b, int n, int m,
      double dt, bool foh, double* out) {
    const int size = n + m * (foh ? 2 : 1);
    Matrix augmented = Matrix::Zero(size, size);
    augmented.topLeftCorner(n, n) = Input(a, n, n) * dt;
    augmented.block(0, n, n, m) = Input(b, n, m) * dt;
    if(foh) {
      augmented.block(n, n + m, m, m).setIdentity();
    }
    Matrix exponential = augmented.exp();
    if(!exponential.allFinite()) {
      return false;
    }
    Output ad(out, n, n);
    Output b0(out + n * n, n, m);
    Output b1(out + n * (n + m), n, m);
    ad = exponential.topLeftCorner(n, n);
    b0 = exponential.block(0, n, n, m);
    b1.setZero();
    if(foh) {
      b1 = exponential.block(0, n + m, n, m);
      b0 -= b1;
    }
    return true;
  }

  // Store each state and output at the sample time before advancing the state.
  static bool simulate(const double* system, const double* initial, const double* input,
      int n, int m, int p, int samples, double* output) {
    int offset = 0;
    const Input a(system + offset, n, n);
    offset += n * n;
    const Input b0(system + offset, n, m);
    offset += n * m;
    const Input b1(system + offset, n, m);
    offset += n * m;
    const Input c(system + offset, p, n);
    offset += p * n;
    const Input d(system + offset, p, m);
    const Input u(input, samples, m);
    Output y(output, samples, p);
    Output trajectory(output + samples * p, samples, n);
    Eigen::VectorXd x = Eigen::Map<const Eigen::VectorXd>(initial, n);
    for(int k = 0; k < samples; ++k) {
      trajectory.row(k) = x.transpose();
      y.row(k) = (c * x + d * u.row(k).transpose()).transpose();
      if(k + 1 < samples) {
        x = (a * x + b0 * u.row(k).transpose() + b1 * u.row(k + 1).transpose()).eval();
      }
    }
    return y.allFinite() && trajectory.allFinite();
  }

  static bool ss2tf(const double* a, const double* b, const double* c, int n, double d, double* out) {
    double* num = out + n + 1;
    out[0] = 1;
    num[0] = d;
    if(!n) return 1;
    const Input A(a, n, n), B(b, n, 1), C(c, 1, n);
    Matrix term = Matrix::Identity(n, n);
    for(int k = 1; k <= n; ++k) {
      const double markov = (C * term * B)(0, 0);
      term = (A * term).eval();
      out[k] = -term.trace() / k;
      num[k] = markov + d * out[k];
      term.diagonal().array() += out[k];
    }
    return Eigen::Map<const Eigen::VectorXd>(out, 2 * (n + 1)).allFinite();
  }

  static bool frequency(const double* num, const double* den, const double* frequencies,
      int numerator_count, int denominator_count, int count, double period, double* out) {
    using Complex = std::complex<double>;
    const auto evaluate = [](const double* coefficients, int size, Complex point) {
      Complex value = coefficients[0];
      for(int i = 1; i < size; ++i) value = value * point + coefficients[i];
      return value;
    };
    for(int i = 0; i < count; ++i) {
      const double w = frequencies[i];
      const Complex point = period ? std::polar(1.0, w * period) : Complex(0, w);
      const Complex response = evaluate(num, numerator_count, point) / evaluate(den, denominator_count, point);
      out[2 * i] = response.real();
      out[2 * i + 1] = response.imag();
    }
    return 1;
  }

  static bool poles(const double* a, int n, double* out) {
    if(!n) return 1;
    const control_core::Input A(a, n, n);
    Eigen::EigenSolver<Eigen::MatrixXd> solver(A, false);
    if(solver.info() != Eigen::Success) return 0;
    const auto values = solver.eigenvalues();
    for(int i = 0; i < n; ++i) {
      out[2 * i] = values[i].real();
      out[2 * i + 1] = values[i].imag();
    }
    return 1;
  }

  static bool stateSubspace(const double* a, const double* channels, int n, int ports,
      int observe, int rank_only, double* out) {
    if(!n || !ports) {
      if(rank_only) out[0] = 0;
      return 1;
    }
    const Input A(a, n, n);
    Matrix basis(n, n * ports);
    if(observe) basis.leftCols(ports) = Input(channels, ports, n).transpose();
    else basis.leftCols(ports) = Input(channels, n, ports);
    for(int k = 1; k < n; ++k) {
      if(observe) {
        basis.middleCols(k * ports, ports).noalias() = A.transpose() * basis.middleCols((k - 1) * ports, ports);
      } else {
        basis.middleCols(k * ports, ports).noalias() = A * basis.middleCols((k - 1) * ports, ports);
      }
    }
    if(!basis.allFinite()) return 0;
    if(rank_only) out[0] = Eigen::ColPivHouseholderQR<Matrix>(basis).rank();
    else if(observe) Output(out, n * ports, n) = basis.transpose();
    else Output(out, n, n * ports) = basis;
    return 1;
  }

  static bool dcgain(const double* a, const double* b, const double* c, const double* d,
      int n, int m, int p, int discrete, double* out) {
    const Input D(d, p, m);
    Output result(out, p, m);
    result = D;
    if(!n || !m || !p) return 1;
    Matrix equilibrium = -Input(a, n, n);
    if(discrete) equilibrium.diagonal().array() += 1;
    const Eigen::FullPivLU<Matrix> solver(equilibrium);
    if(!solver.isInvertible()) return 0;
    result.noalias() += Input(c, p, n) * solver.solve(Input(b, n, m));
    return result.allFinite();
  }
};
}

#endif
