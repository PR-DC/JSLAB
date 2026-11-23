// JSLAB - control-margin.h
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// --------------------

#ifndef JSLAB_CONTROL_MARGIN_H
#define JSLAB_CONTROL_MARGIN_H

#include "native-module-core.h"
#include <algorithm>
#include <limits>

namespace control_core {
using Polynomial = std::vector<double>;
using Complex = std::complex<double>;

class Margins {
  static Complex evaluate(const Polynomial& polynomial, Complex point) {
    Complex value = 0;
    for(double coefficient : polynomial) value = value * point + coefficient;
    return value;
  }

  // Return ascending coefficients after substituting z=(1+s)/(1-s).
  static Polynomial marginPolynomial(const Polynomial& coefficients, int order, bool discrete) {
    if(!discrete) return Polynomial(coefficients.rbegin(), coefficients.rend());
    Polynomial result(order + 1);
    for(int i = 0; i < static_cast<int>(coefficients.size()); ++i) {
      const int power = static_cast<int>(coefficients.size()) - 1 - i;
      Polynomial term(order + 1);
      term[0] = coefficients[i];
      for(int j = 0; j < order; ++j) {
        const double sign = j < power ? 1 : -1;
        for(int k = j + 1; k > 0; --k) term[k] += sign * term[k - 1];
      }
      for(int k = 0; k <= order; ++k) result[k] += term[k];
    }
    return result;
  }

  static void marginProduct(const Polynomial& left, const Polynomial& right, double scale, Polynomial& result) {
    for(int i = 0; i < static_cast<int>(left.size()); ++i) {
      for(int j = 0; j < static_cast<int>(right.size()); ++j) {
        const int degree = i + j;
        const double sign = (j + degree / 2) % 2 ? -scale : scale;
        result[degree] += sign * left[i] * right[j];
      }
    }
  }

 public:
  static bool compute(const Polynomial& numerator, const Polynomial& denominator, double period,
      double tolerance, double* out) {
    const double pi = std::acos(-1.0);
    const int order = static_cast<int>(std::max(numerator.size(), denominator.size())) - 1;
    const auto num = marginPolynomial(numerator, order, period > 0);
    const auto den = marginPolynomial(denominator, order, period > 0);
    Polynomial cross(2 * order + 1), unit(2 * order + 1);
    marginProduct(num, den, 1, cross);
    marginProduct(num, num, 1, unit);
    marginProduct(den, den, -1, unit);
    out[0] = std::numeric_limits<double>::infinity();
    out[1] = 180;
    out[2] = out[3] = std::numeric_limits<double>::quiet_NaN();
    const auto check = [&](double w, bool gain) {
      const Complex point = period ? std::polar(1.0, w * period) : Complex(0, w);
      const Complex response = evaluate(numerator, point) / evaluate(denominator, point);
      const double magnitude = std::abs(response);
      if(!std::isfinite(magnitude) || magnitude == 0) return;
      if(gain) {
        if(response.real() >= 0 || std::abs(response.imag()) > tolerance * magnitude) return;
        const double value = 1 / magnitude;
        if(!std::isfinite(out[2]) || (value >= 1 && (out[0] < 1 || value < out[0])) ||
            (value < 1 && out[0] < 1 && value > out[0])) {
          out[0] = value;
          out[2] = w;
        }
      } else if(std::abs(magnitude - 1) <= tolerance * 8) {
        const double angle = std::remainder(std::arg(response) + pi, 2 * pi) * 180 / pi;
        if(!std::isfinite(out[3]) || std::abs(angle) < std::abs(out[1])) {
          out[1] = angle;
          out[3] = w;
        }
      }
    };
    const auto crossovers = [&](const Polynomial& coefficients, bool odd) {
      Polynomial equation;
      for(int i = odd ? 1 : 0; i < static_cast<int>(coefficients.size()); i += 2) equation.push_back(coefficients[i]);
      while(!equation.empty() && equation.back() == 0) equation.pop_back();
      if(equation.empty()) return true;
      if(period) check(pi / period, odd);
      if(equation.size() == 1) return true;
      std::reverse(equation.begin(), equation.end());
      native_module_core::RootsResult roots;
      if(!native_module_core::roots(equation, &roots)) return false;
      for(std::size_t i = 0; i < roots.real.size(); ++i) {
        const double root = roots.real[i];
        if(root <= 0 || std::abs(roots.imag[i]) > tolerance * std::max(1.0, root)) continue;
        const double w = std::sqrt(root);
        check(period ? 2 * std::atan(w) / period : w, odd);
      }
      return true;
    };
    return crossovers(cross, true) && crossovers(unit, false);
  }
};
}
#endif
