// AlphaShape3D - alpha-shape-3d-napi.h
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// info@prdc.rs
// --------------------

#ifndef ALPHA_SHAPE_3D_NAPI_H
#define ALPHA_SHAPE_3D_NAPI_H

//#define DEBUG_ALPHA_SHAPE_3D
//#define DEBUG_ALPHA_SHAPE_3D_LEVEL 0
//#define PROFILE_ALPHA_SHAPE_3D

#include <napi.h>
#include <string>
#include <vector>

#include "alpha-shape-3d-core.h"

namespace alpha_shape_3d_ns {

using alpha_shape_3d_core::AlphaShape3DCore;
using alpha_shape_3d_core::Matrix;

class AlphaShape3D : public Napi::ObjectWrap<AlphaShape3D> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  AlphaShape3D(const Napi::CallbackInfo& info);
  ~AlphaShape3D();

  // New JavaScript wrapper methods
  void NewShapeJS(const Napi::CallbackInfo& info);
  Napi::Value GetAlphaJS(const Napi::CallbackInfo& info);
  void SetAlphaJS(const Napi::CallbackInfo& info);
  Napi::Value GetNumRegionsJS(const Napi::CallbackInfo& info);
  Napi::Value GetAlphaSpectrumJS(const Napi::CallbackInfo& info);
  Napi::Value GetCriticalAlphaJS(const Napi::CallbackInfo& info);
  Napi::Value GetSurfaceAreaJS(const Napi::CallbackInfo& info);
  Napi::Value GetVolumeJS(const Napi::CallbackInfo& info);
  Napi::Value GetBoundaryFacetsJS(const Napi::CallbackInfo& info);
  void WriteBoundaryFacetsJS(const Napi::CallbackInfo& info);
  Napi::Value CheckInShapeJS(const Napi::CallbackInfo& info);
  void WriteOffJS(const Napi::CallbackInfo& info);
  Napi::Value GetTriangulationJS(const Napi::CallbackInfo& info);
  Napi::Value GetNearestNeighborJS(const Napi::CallbackInfo& info);
  Napi::Value GetSimplifiedShapeJS(const Napi::CallbackInfo& info);
  Napi::Value RemoveUnusedPointsJS(const Napi::CallbackInfo& info);
    
private:
  AlphaShape3DCore core;
};

}// namespace alpha_shape_3d_ns

#endif // ALPHA_SHAPE_3D_NAPI_H
