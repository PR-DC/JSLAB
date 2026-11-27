// JSLAB - control-identification.cpp
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// --------------------

#include "control-core.h"
#include <cmath>
#include <limits>
#include <vector>

namespace {
using control_core::Matrix;
using Eigen::VectorXd;

struct Fit {
  VectorXd numerator;
  VectorXd residual;
  double cost = std::numeric_limits<double>::infinity();
};

// For a fixed denominator, eliminate the linear numerator parameters using
// pivoted QR. Only the denominator is passed to the nonlinear optimizer.
class TransferFit {
 public:
  static Fit evaluate(const VectorXd& denominator, const VectorXd& input,
      const VectorXd& output, int zeros, bool foh) {
    const int n = static_cast<int>(denominator.size());
    const int samples = static_cast<int>(input.size());
    Eigen::MatrixXd design(samples, zeros + 1);
    if(!n) {
      design.col(0) = input;
    } else {
      Matrix a = Matrix::Zero(n, n);
      for(int i = 0; i < n - 1; ++i) {
        a(i, i + 1) = 1;
      }
      a.row(n - 1) = -denominator.reverse().transpose();
      VectorXd b = VectorXd::Zero(n);
      b[n - 1] = 1;
      std::vector<double> held(n * (n + 2));
      if(!control_core::Models::discretize(a.data(), b.data(), n, 1, 1.0 / (samples - 1),
          foh, held.data())) {
        return {};
      }
      const control_core::Input ad(held.data(), n, n);
      const Eigen::Map<const VectorXd> b0(held.data() + n * n, n);
      const Eigen::Map<const VectorXd> b1(held.data() + n * (n + 1), n);
      VectorXd state = VectorXd::Zero(n), next(n);
      for(int sample = 0; sample < samples; ++sample) {
        for(int col = 0; col <= zeros; ++col) {
          const int degree = zeros - col;
          design(sample, col) = degree == n ?
            input[sample] - denominator.reverse().dot(state) : state[degree];
        }
        if(sample + 1 < samples) {
          next.noalias() = ad * state;
          next.noalias() += b0 * input[sample] + b1 * input[sample + 1];
          state.swap(next);
          if(!state.allFinite()) {
            return {};
          }
        }
      }
    }
    if(!design.allFinite()) {
      return {};
    }
    Eigen::ColPivHouseholderQR<Eigen::MatrixXd> qr(design);
    if(qr.rank() < design.cols()) {
      return {};
    }
    Fit fit;
    fit.numerator = qr.solve(output);
    fit.residual = design * fit.numerator - output;
    fit.cost = fit.residual.squaredNorm();
    if(!std::isfinite(fit.cost) || !fit.numerator.allFinite()) {
      return {};
    }
    return fit;
  }

  static VectorXd initialDenominator(int n, double rate) {
    VectorXd coefficients = VectorXd::Zero(n + 1);
    coefficients[0] = 1;
    for(int pole = 0; pole < n; ++pole) {
      const double pole_rate = rate * std::pow(1.5, pole - (n - 1) * 0.5);
      for(int i = pole + 1; i > 0; --i) {
        coefficients[i] += pole_rate * coefficients[i - 1];
      }
    }
    return coefficients.tail(n);
  }

  static Fit refine(VectorXd& parameters, const VectorXd& input, const VectorXd& output,
      int zeros, bool foh) {
    Fit fit = evaluate(parameters, input, output, zeros, foh);
    const int n = static_cast<int>(parameters.size());
    if(!n || !std::isfinite(fit.cost)) {
      return fit;
    }
    const int samples = static_cast<int>(output.size());
    const double noise_floor = 1e-24 * std::max(1.0, output.squaredNorm());
    double damping = 1e-3;
    for(int iteration = 0; iteration < 100 && fit.cost > noise_floor; ++iteration) {
      Eigen::MatrixXd jacobian(samples + n, n);
      VectorXd right_hand_side = VectorXd::Zero(samples + n);
      right_hand_side.head(samples) = -fit.residual;
      for(int col = 0; col < n; ++col) {
        const double delta = 1e-5 * std::max(1.0, std::abs(parameters[col]));
        VectorXd shifted = parameters;
        shifted[col] += delta;
        Fit forward = evaluate(shifted, input, output, zeros, foh);
        shifted[col] -= 2 * delta;
        Fit backward = evaluate(shifted, input, output, zeros, foh);
        if(std::isfinite(forward.cost) && std::isfinite(backward.cost)) {
          jacobian.col(col).head(samples) = (forward.residual - backward.residual) / (2 * delta);
        } else if(std::isfinite(forward.cost)) {
          jacobian.col(col).head(samples) = (forward.residual - fit.residual) / delta;
        } else if(std::isfinite(backward.cost)) {
          jacobian.col(col).head(samples) = (fit.residual - backward.residual) / delta;
        } else {
          return fit;
        }
      }
      const VectorXd column_scales = jacobian.topRows(samples).colwise().norm().transpose().cwiseMax(1e-12);
      jacobian.bottomRows(n).setZero();
      jacobian.bottomRows(n).diagonal() = std::sqrt(damping) * column_scales;
      const VectorXd change = jacobian.colPivHouseholderQr().solve(right_hand_side);
      if(!change.allFinite()) {
        break;
      }
      VectorXd candidate = parameters + change;
      Fit next = evaluate(candidate, input, output, zeros, foh);
      if(next.cost < fit.cost) {
        const double improvement = fit.cost - next.cost;
        parameters.swap(candidate);
        fit = std::move(next);
        damping = std::max(1e-12, damping * 0.25);
        if(improvement < 1e-12 * fit.cost) {
          break;
        }
      } else {
        damping *= 10;
        if(damping > 1e12) {
          break;
        }
      }
    }
    return fit;
  }
};
}

bool control_core::Identification::fit(const double* input, const double* output, const double* initial,
    int samples, int poles, int zeros, double duration, bool use_initial, bool foh, double* result) {
  const VectorXd u = Eigen::Map<const VectorXd>(input, samples);
  const VectorXd y = Eigen::Map<const VectorXd>(output, samples);
  const double input_scale = u.cwiseAbs().maxCoeff();
  const double output_scale = std::max(std::numeric_limits<double>::min(), y.cwiseAbs().maxCoeff());
  if(input_scale == 0 || !std::isfinite(duration) || duration <= 0) {
    return false;
  }
  const VectorXd scaled_input = u / input_scale;
  const VectorXd scaled_output = y / output_scale;
  Fit best;
  VectorXd denominator(poles);
  for(double rate : {1.0, 4.0, 16.0, 64.0}) {
    VectorXd candidate = TransferFit::initialDenominator(poles, rate);
    if(use_initial) {
      for(int i = 0; i < poles; ++i) {
        candidate[i] = initial[i] * std::pow(duration, i + 1);
      }
    }
    Fit fit = TransferFit::refine(candidate, scaled_input, scaled_output, zeros, foh);
    if(fit.cost < best.cost) {
      denominator.swap(candidate);
      best = std::move(fit);
    }
    if(use_initial || !poles || best.cost < 1e-24) {
      break;
    }
  }
  if(!std::isfinite(best.cost)) {
    return false;
  }
  result[0] = best.cost / samples * output_scale * output_scale;
  for(int i = 0; i < poles; ++i) {
    result[i + 1] = denominator[i] / std::pow(duration, i + 1);
  }
  for(int i = 0; i <= zeros; ++i) {
    result[poles + i + 1] = best.numerator[i] * (output_scale / input_scale) /
      std::pow(duration, poles - zeros + i);
  }
  return Eigen::Map<VectorXd>(result, poles + zeros + 2).allFinite();
}
