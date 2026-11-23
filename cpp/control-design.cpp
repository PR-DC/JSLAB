// JSLAB - control-design.cpp
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// --------------------

#include <Eigen/Dense>
#include <Eigen/Eigenvalues>
#include <algorithm>
#include <cmath>
#include <limits>
#include "control-core.h"

namespace {
using Eigen::MatrixXd;
using RowMatrix = Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;
using Input = Eigen::Map<const RowMatrix>;
using Output = Eigen::Map<RowMatrix>;

class Riccati {
 public:
  static bool continuousRiccati(const MatrixXd& a, const MatrixXd& g, const MatrixXd& q, MatrixXd& x) {
    const Eigen::Index n = a.rows();
    const MatrixXd identity = MatrixXd::Identity(2 * n, 2 * n);
    MatrixXd sign(2 * n, 2 * n);
    sign << a, -g, -q, -a.transpose();
    for(int iteration = 0; iteration < 80; ++iteration) {
      const auto lu = sign.fullPivLu();
      if(!lu.isInvertible()) {
        return false;
      }
      const MatrixXd inverse = lu.solve(identity);
      const double scale = std::sqrt(inverse.stableNorm() / sign.stableNorm());
      MatrixXd next = 0.5 * (scale * sign + inverse / scale);
      if(!next.allFinite()) {
        return false;
      }
      if((next - sign).norm() <= 1e-12 * next.norm()) {
        const MatrixXd projection = identity - next;
        const auto qr = projection.topRows(n).transpose().colPivHouseholderQr();
        if(qr.rank() != n) {
          return false;
        }
        x = qr.solve(projection.bottomRows(n).transpose()).transpose();
        return x.allFinite();
      }
      sign.swap(next);
    }
    return false;
  }

  // Structure-preserving doubling advances the Riccati iteration by powers of two.
  static bool discreteRiccati(MatrixXd a, MatrixXd g, MatrixXd q, MatrixXd& x) {
    const MatrixXd identity = MatrixXd::Identity(a.rows(), a.rows());
    for(int iteration = 0; iteration < 80; ++iteration) {
      const auto lu = (identity + g * q).eval().fullPivLu();
      if(!lu.isInvertible()) {
        return false;
      }
      const MatrixXd solved = lu.solve(a);
      const MatrixXd solved_gain = lu.solve(g);
      MatrixXd next = q + a.transpose() * q * solved;
      if(!next.allFinite()) {
        return false;
      }
      if((next - q).norm() <= 1e-12 * std::max(1.0, next.norm())) {
        x = next;
        return true;
      }
      g += a * solved_gain * a.transpose();
      a = (a * solved).eval();
      q.swap(next);
    }
    return false;
  }
};
}

bool control_core::Design::place(const double* a, const double* b, const double* coefficients,
    int n, int m, double* out) {
  const Input state(a, n, n), input(b, n, m);
  Eigen::Index selected;
  const double input_norm = input.colwise().norm().maxCoeff(&selected);
  if(!(input_norm > 0)) return 0;
  const double scale = std::max(1.0, state.norm());
  const double cutoff = 64 * n * std::numeric_limits<double>::epsilon() * scale;
  MatrixXd basis(n, n);
  MatrixXd preliminary = MatrixXd::Zero(m, n);
  basis.col(0) = input.col(selected) / input_norm;
  double controllability_scale = input_norm;
  // Build an orthogonal cyclic basis by assigning preliminary feedback on each basis vector.
  for(int i = 0; i + 1 < n; ++i) {
    const auto used = basis.leftCols(i + 1);
    Eigen::VectorXd next = state * basis.col(i);
    const auto orthogonalize = [&](Eigen::Ref<Eigen::VectorXd> vector) {
      for(int pass = 0; pass < 2; ++pass) {
        vector -= (used * (used.transpose() * vector)).eval();
      }
    };
    orthogonalize(next);
    if(next.norm() <= cutoff) {
      Eigen::VectorXd best = Eigen::VectorXd::Zero(n);
      Eigen::Index channel = 0;
      for(int j = 0; j < m; ++j) {
        Eigen::VectorXd residual = (scale / input_norm) * input.col(j);
        orthogonalize(residual);
        if(residual.squaredNorm() > best.squaredNorm()) {
          best = residual;
          channel = j;
        }
      }
      if(best.norm() <= cutoff) return 0;
      preliminary(channel, i) = scale / input_norm;
      next += best;
    }
    const double length = next.norm();
    if(!(length > cutoff)) return 0;
    basis.col(i + 1) = next / length;
    controllability_scale *= length;
  }
  if(!std::isfinite(controllability_scale) || controllability_scale == 0) return 0;
  const MatrixXd feedback = preliminary * basis.transpose();
  const MatrixXd cyclic = state + input * feedback;
  const Eigen::RowVectorXd last = basis.col(n - 1).transpose() / controllability_scale;
  Eigen::RowVectorXd gain = last;
  for(int i = 0; i < n; ++i) {
    gain = (gain * cyclic + coefficients[i] * last).eval();
  }
  Output result(out, m, n);
  result = -feedback;
  result.row(selected) += gain;
  return result.allFinite();
}

bool control_core::Design::lqr(const double* a_in, const double* b_in, const double* q_in,
    const double* r_in, const double* s_in, int n, int m, bool discrete, double* result) {
  const MatrixXd a = Input(a_in, n, n), b = Input(b_in, n, m), q = Input(q_in, n, n);
  const MatrixXd r = Input(r_in, m, m), s = Input(s_in, n, m);
  const Eigen::LLT<MatrixXd> r_solver(r);
  if(r_solver.info() != Eigen::Success) {
    return 0;
  }
  const MatrixXd cross = r_solver.solve(s.transpose());
  const MatrixXd shifted_a = a - b * cross;
  const MatrixXd shifted_q = q - s * cross;
  const MatrixXd g = b * r_solver.solve(b.transpose());
  MatrixXd x;
  const bool solved = discrete ? Riccati::discreteRiccati(shifted_a, g, shifted_q, x) :
    Riccati::continuousRiccati(shifted_a, g, shifted_q, x);
  if(!solved) {
    return 0;
  }
  x = (0.5 * (x + x.transpose())).eval();
  MatrixXd lhs = r;
  MatrixXd rhs = b.transpose() * x + s.transpose();
  MatrixXd residual = q;
  if(discrete) {
    lhs += b.transpose() * x * b;
    rhs = b.transpose() * x * a + s.transpose();
    residual += a.transpose() * x * a - x;
  } else {
    residual += a.transpose() * x + x * a;
  }
  const Eigen::LLT<MatrixXd> gain_solver(lhs);
  if(gain_solver.info() != Eigen::Success) {
    return 0;
  }
  const MatrixXd k = gain_solver.solve(rhs);
  const MatrixXd correction = rhs.transpose() * k;
  const double scale = std::max({1.0, q.norm(), residual.norm(), correction.norm()});
  if(!k.allFinite() || (residual - correction).norm() > 1e-8 * scale) {
    return 0;
  }
  const Eigen::EigenSolver<MatrixXd> poles(a - b * k, false);
  if(poles.info() != Eigen::Success) {
    return 0;
  }
  for(int i = 0; i < n; ++i) {
    const auto pole = poles.eigenvalues()[i];
    if(discrete ? std::abs(pole) >= 1 : pole.real() >= 0) {
      return 0;
    }
    result[n * (n + m) + 2 * i] = pole.real();
    result[n * (n + m) + 2 * i + 1] = pole.imag();
  }
  Output riccati(result, n, n), gain(result + n * n, m, n);
  riccati = x;
  gain = k;
  return 1;
}
