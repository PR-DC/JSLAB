// JSLAB - geometry-disk-core.h
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// info@prdc.rs
// --------------------

#ifndef GEOMETRY_DISK_CORE_H
#define GEOMETRY_DISK_CORE_H

#include <algorithm>
#include <cmath>
#include <Eigen/Dense>

namespace native_module_core {

// Euclidean distance between filled disks. Feasible closest points give an
// upper bound; support functions give a separating-plane lower bound.
// Returns -1 rather than reporting an uncertified iteration as successful.
inline int minDisksDistance3D(const double* input, double* output) {
  using Eigen::Vector3d;
  if(!input || !output) return 0;
  for(int i = 0; i < 14; ++i) {
    if(!std::isfinite(input[i])) return 0;
  }
  const Vector3d origin(input[0], input[1], input[2]);
  Vector3d na(input[3], input[4], input[5]);
  Vector3d cb = Vector3d(input[7], input[8], input[9]) - origin;
  Vector3d nb(input[10], input[11], input[12]);
  const double ra = input[6], rb = input[13];
  const double la = na.stableNorm(), lb = nb.stableNorm();
  if(ra < 0 || rb < 0 || la == 0 || lb == 0 ||
      !std::isfinite(la) || !std::isfinite(lb) || !cb.allFinite()) return 0;
  na /= la;
  nb /= lb;
  const double tolerance = 1e-10 * std::max({1.0, ra, rb, cb.stableNorm()});
  auto project = [](const Vector3d& x, const Vector3d& c,
      const Vector3d& n, double r) -> Vector3d {
    const Vector3d delta = x - c;
    Vector3d radial = delta - n * delta.dot(n);
    const double length = radial.stableNorm();
    if(length > r) radial *= r / length;
    return c + radial;
  };
  auto save = [&](const Vector3d& p, const Vector3d& q, double lower, int iterations) {
    output[0] = (q - p).stableNorm();
    output[1] = lower;
    for(int i = 0; i < 3; ++i) {
      output[2 + i] = p[i] + origin[i];
      output[5 + i] = q[i] + origin[i];
    }
    output[8] = iterations;
    return 1;
  };
  const Vector3d zero = Vector3d::Zero();
  const Vector3d cross = na.cross(nb);
  const double cross_length = cross.stableNorm();
  if(cross_length <= 1e-14) {
    // Parallel planes, including coincident disks and opposite normals.
    const double height = cb.dot(na);
    const Vector3d radial = cb - height * na;
    const double d = radial.stableNorm();
    const Vector3d direction = d > 0 ? Vector3d(radial / d) : zero;
    const Vector3d p = direction * std::min(ra, d);
    const Vector3d q = d <= ra + rb ? Vector3d(p + height * na) :
      Vector3d(cb - rb * direction);
    return save(p, q, (q - p).stableNorm(), 0);
  }
  // Check the overlap of the disks' intervals on the planes' intersection
  // line. This also handles tangencies where alternating projections are slow.
  const Vector3d direction = cross / cross_length;
  const Vector3d line_point = direction.cross(na) * (nb.dot(cb) / cross_length);
  const double ta = -line_point.dot(direction);
  const double tb = (cb - line_point).dot(direction);
  const double da = (line_point + ta * direction).stableNorm();
  const double db = (line_point + tb * direction - cb).stableNorm();
  if(da <= ra && db <= rb) {
    const double ha = std::sqrt(std::max(0.0, (ra - da) * (ra + da)));
    const double hb = std::sqrt(std::max(0.0, (rb - db) * (rb + db)));
    const double lo = std::max(ta - ha, tb - hb);
    const double hi = std::min(ta + ha, tb + hb);
    if(lo <= hi) {
      const Vector3d witness = line_point + (lo + (hi - lo) / 2) * direction;
      const Vector3d p = project(witness, zero, na, ra);
      const Vector3d q = project(witness, cb, nb, rb);
      if((q - p).stableNorm() <= tolerance) return save(p, q, 0, 0);
    }
  }
  Vector3d p = project(cb, zero, na, ra), q = cb;
  for(int iteration = 1; iteration <= 100000; ++iteration) {
    q = project(p, cb, nb, rb);
    p = project(q, zero, na, ra);
    const Vector3d delta = q - p;
    const double upper = delta.stableNorm();
    if(!std::isfinite(upper)) return 0;
    if(upper <= tolerance) return save(p, q, 0, iteration);
    const Vector3d u = delta / upper;
    const double lower = std::max(0.0, u.dot(cb) -
      ra * (u - na * u.dot(na)).stableNorm() -
      rb * (u - nb * u.dot(nb)).stableNorm());
    if(upper - lower <= tolerance) return save(p, q, lower, iteration);
  }
  return -1;
}

}
#endif
