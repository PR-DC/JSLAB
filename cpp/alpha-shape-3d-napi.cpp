// AlphaShape3D - alpha-shape-3d-napi.cpp
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// info@prdc.rs
// --------------------

#include "alpha-shape-3d-napi.h"

namespace alpha_shape_3d_ns {

static Matrix matrixFromJsPointArray(Napi::Env env, Napi::Value value,
    const char* array_error, const char* row_error) {
  Matrix result;
  Napi::Array js_rows;
  uint32_t row_count;
  uint32_t i;
  uint32_t j;

  if(!value.IsArray()) {
    Napi::TypeError::New(env, array_error).ThrowAsJavaScriptException();
    return result;
  }

  js_rows = value.As<Napi::Array>();
  row_count = js_rows.Length();
  result.resize(row_count, 3);

  for(i = 0; i < row_count; i++) {
    Napi::Value row_value = js_rows.Get(i);
    if(!row_value.IsArray()) {
      Napi::TypeError::New(env, row_error).ThrowAsJavaScriptException();
      return Matrix();
    }
    Napi::Array row = row_value.As<Napi::Array>();
    if(row.Length() != 3) {
      Napi::TypeError::New(env, row_error).ThrowAsJavaScriptException();
      return Matrix();
    }
    for(j = 0; j < 3; j++) {
      result(i, j) = row.Get(j).As<Napi::Number>().DoubleValue();
    }
  }

  return result;
}

static Napi::Array matrixToJsNestedArray(Napi::Env env, const Matrix& matrix) {
  Napi::Array result = Napi::Array::New(env, matrix.numRows());
  uint32_t i;
  uint32_t j;

  for(i = 0; i < matrix.numRows(); i++) {
    Napi::Array row = Napi::Array::New(env, matrix.numCols());
    for(j = 0; j < matrix.numCols(); j++) {
      row.Set(j, Napi::Number::New(env, matrix(i, j)));
    }
    result.Set(i, row);
  }

  return result;
}

static Napi::Array matrixColumnToJsNumberArray(Napi::Env env, const Matrix& matrix) {
  Napi::Array result = Napi::Array::New(env, matrix.numRows());
  uint32_t i;

  for(i = 0; i < matrix.numRows(); i++) {
    result.Set(i, Napi::Number::New(env, matrix(i, 0)));
  }

  return result;
}

static Napi::Array matrixColumnToJsBooleanArray(Napi::Env env, const Matrix& matrix) {
  Napi::Array result = Napi::Array::New(env, matrix.numRows());
  uint32_t i;

  for(i = 0; i < matrix.numRows(); i++) {
    result.Set(i, Napi::Boolean::New(env, matrix(i, 0) != 0));
  }

  return result;
}

AlphaShape3D::AlphaShape3D(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<AlphaShape3D>(info) {
}

AlphaShape3D::~AlphaShape3D() {
}

Napi::Object AlphaShape3D::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "AlphaShape3D", {
    InstanceMethod("newShape", &AlphaShape3D::NewShapeJS),
    InstanceMethod("getAlpha", &AlphaShape3D::GetAlphaJS),
    InstanceMethod("setAlpha", &AlphaShape3D::SetAlphaJS),
    InstanceMethod("getNumRegions", &AlphaShape3D::GetNumRegionsJS),
    InstanceMethod("getAlphaSpectrum", &AlphaShape3D::GetAlphaSpectrumJS),
    InstanceMethod("getCriticalAlpha", &AlphaShape3D::GetCriticalAlphaJS),
    InstanceMethod("getSurfaceArea", &AlphaShape3D::GetSurfaceAreaJS),
    InstanceMethod("getVolume", &AlphaShape3D::GetVolumeJS),
    InstanceMethod("getBoundaryFacets", &AlphaShape3D::GetBoundaryFacetsJS),
    InstanceMethod("writeBoundaryFacets", &AlphaShape3D::WriteBoundaryFacetsJS),
    InstanceMethod("checkInShape", &AlphaShape3D::CheckInShapeJS),
    InstanceMethod("writeOff", &AlphaShape3D::WriteOffJS),
    InstanceMethod("getTriangulation", &AlphaShape3D::GetTriangulationJS),
    InstanceMethod("getNearestNeighbor", &AlphaShape3D::GetNearestNeighborJS),
    InstanceMethod("getSimplifiedShape", &AlphaShape3D::GetSimplifiedShapeJS),
    InstanceMethod("removeUnusedPoints", &AlphaShape3D::RemoveUnusedPointsJS)
  });
  Napi::FunctionReference* constructor = new Napi::FunctionReference();
  *constructor = Napi::Persistent(func);
  env.SetInstanceData(constructor);

  exports.Set("AlphaShape3D", func);
  return exports;
}

void AlphaShape3D::NewShapeJS(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Matrix points = matrixFromJsPointArray(env, info[0],
    "Array of points expected",
    "Each point should have exactly 3 coordinates");

  if(env.IsExceptionPending()) {
    return;
  }
  core.newShape(points);
}

Napi::Value AlphaShape3D::GetAlphaJS(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), core.getAlpha());
}

void AlphaShape3D::SetAlphaJS(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if(info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
    return;
  }
  core.setAlpha(info[0].As<Napi::Number>().DoubleValue());
}

Napi::Value AlphaShape3D::GetNumRegionsJS(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), core.numRegions());
}

Napi::Value AlphaShape3D::GetAlphaSpectrumJS(const Napi::CallbackInfo& info) {
  Matrix spectrum = core.getAlphaSpectrum();
  Napi::Array result = Napi::Array::New(info.Env(), spectrum.numCols());
  uint32_t i;

  for(i = 0; i < spectrum.numCols(); i++) {
    result.Set(i, Napi::Number::New(info.Env(), spectrum(0, i)));
  }
  return result;
}

Napi::Value AlphaShape3D::GetCriticalAlphaJS(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if(info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
    return env.Null();
  }
  return Napi::Number::New(env,
    core.getCriticalAlpha(info[0].As<Napi::String>().Utf8Value()));
}

Napi::Value AlphaShape3D::GetSurfaceAreaJS(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), core.getSurfaceArea());
}

Napi::Value AlphaShape3D::GetVolumeJS(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), core.getVolume());
}

Napi::Value AlphaShape3D::GetBoundaryFacetsJS(const Napi::CallbackInfo& info) {
  return matrixToJsNestedArray(info.Env(), core.getBoundaryFacets());
}

void AlphaShape3D::WriteBoundaryFacetsJS(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if(info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
    return;
  }
  core.writeBoundaryFacets(info[0].As<Napi::String>().Utf8Value());
}

Napi::Value AlphaShape3D::CheckInShapeJS(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Matrix query_points = matrixFromJsPointArray(env, info[0],
    "Array expected",
    "Each point should have exactly 3 coordinates");

  if(env.IsExceptionPending()) {
    return env.Null();
  }
  return matrixColumnToJsBooleanArray(env, core.checkInShape(query_points));
}

void AlphaShape3D::WriteOffJS(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Matrix points;
  Matrix facets;

  if(info.Length() < 3 || !info[0].IsString() || !info[1].IsArray() ||
      !info[2].IsArray()) {
    Napi::TypeError::New(env,
      "Expected arguments: filename (string), points (array), facets (array)")
      .ThrowAsJavaScriptException();
    return;
  }

  points = matrixFromJsPointArray(env, info[1],
    "Array of points expected",
    "Each point should have exactly 3 coordinates");
  if(env.IsExceptionPending()) {
    return;
  }
  facets = matrixFromJsPointArray(env, info[2],
    "Array of facets expected",
    "Each facet should have exactly 3 coordinates");
  if(env.IsExceptionPending()) {
    return;
  }

  core.writeOff(info[0].As<Napi::String>().Utf8Value(), points, facets);
}

Napi::Value AlphaShape3D::GetTriangulationJS(const Napi::CallbackInfo& info) {
  return matrixToJsNestedArray(info.Env(), core.getTriangulation());
}

Napi::Value AlphaShape3D::GetNearestNeighborJS(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Matrix query_points = matrixFromJsPointArray(env, info[0],
    "Array expected",
    "Each point should have exactly 3 coordinates");
  std::pair<Matrix, Matrix> result;
  Napi::Object js_result;

  if(env.IsExceptionPending()) {
    return env.Null();
  }

  result = core.getNearestNeighbor(query_points);
  js_result = Napi::Object::New(env);
  js_result.Set("indices", matrixColumnToJsNumberArray(env, result.first));
  js_result.Set("distances", matrixColumnToJsNumberArray(env, result.second));
  return js_result;
}

Napi::Value AlphaShape3D::GetSimplifiedShapeJS(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::pair<Matrix, Matrix> result;
  Napi::Object js_result = Napi::Object::New(env);

  if(info.Length() == 0) {
    result = core.getSimplifiedShape();
  } else if(info.Length() == 1) {
    if(info[0].IsNumber()) {
      result = core.getSimplifiedShape(info[0].As<Napi::Number>().DoubleValue());
    } else if(info[0].IsString()) {
      result = core.getSimplifiedShape(info[0].As<Napi::String>().Utf8Value());
    } else {
      Napi::TypeError::New(env, "Invalid argument type").ThrowAsJavaScriptException();
      return env.Null();
    }
  } else if(info.Length() == 2 && info[0].IsNumber() && info[1].IsString()) {
    result = core.getSimplifiedShape(
      info[0].As<Napi::Number>().DoubleValue(),
      info[1].As<Napi::String>().Utf8Value());
  } else {
    Napi::TypeError::New(env, "Invalid arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  js_result.Set("points", matrixToJsNestedArray(env, result.first));
  js_result.Set("facets", matrixToJsNestedArray(env, result.second));
  return js_result;
}

Napi::Value AlphaShape3D::RemoveUnusedPointsJS(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Matrix points;
  Matrix facets;
  std::pair<Matrix, Matrix> result;
  Napi::Object js_result = Napi::Object::New(env);

  if(info.Length() < 2 || !info[0].IsArray() || !info[1].IsArray()) {
    Napi::TypeError::New(env, "Two arrays expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  points = matrixFromJsPointArray(env, info[0],
    "Array of points expected",
    "Each point should have exactly 3 coordinates");
  if(env.IsExceptionPending()) {
    return env.Null();
  }
  facets = matrixFromJsPointArray(env, info[1],
    "Array of facets expected",
    "Each facet should have exactly 3 coordinates");
  if(env.IsExceptionPending()) {
    return env.Null();
  }

  result = core.removeUnusedPoints(points, facets);
  js_result.Set("points", matrixToJsNestedArray(env, result.first));
  js_result.Set("facets", matrixToJsNestedArray(env, result.second));
  return js_result;
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  return AlphaShape3D::Init(env, exports);
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)

} // namespace alpha_shape_3d_ns
