// AlphaShape3D - alpha-shape-3d-wasm.cpp
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// info@prdc.rs
// --------------------

#include <cstdint>
#include <stdexcept>
#include <string>

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "alpha-shape-3d-core.h"

namespace alpha_shape_3d_wasm_ns {

using namespace emscripten;
using alpha_shape_3d_core::AlphaShape3DCore;
using alpha_shape_3d_core::Matrix;

class AlphaShape3D {
 public:
  AlphaShape3D() {}
  ~AlphaShape3D() {}

  void newShape(val js_points) {
    core.newShape(matrixFromJsPointArray(js_points,
      "Array of points expected",
      "Each point should have exactly 3 coordinates"));
  }

  double getAlpha() {
    return core.getAlpha();
  }

  void setAlpha(double alpha) {
    core.setAlpha(alpha);
  }

  double getNumRegions() {
    return core.numRegions();
  }

  val getAlphaSpectrum() {
    Matrix spectrum = core.getAlphaSpectrum();
    val result = val::array();
    uint32_t i;

    for(i = 0; i < spectrum.numCols(); i++) {
      result.call<void>("push", spectrum(0, i));
    }
    return result;
  }

  double getCriticalAlpha(const std::string& type) {
    return core.getCriticalAlpha(type);
  }

  double getSurfaceArea() {
    return core.getSurfaceArea();
  }

  double getVolume() {
    return core.getVolume();
  }

  val getBoundaryFacets() {
    Matrix facets = core.getBoundaryFacets();
    val result = val::array();
    uint32_t i;
    uint32_t j;

    for(i = 0; i < facets.numRows(); i++) {
      val row = val::array();
      for(j = 0; j < facets.numCols(); j++) {
        row.call<void>("push", facets(i, j));
      }
      result.call<void>("push", row);
    }

    return result;
  }

 private:
  std::size_t getArrayLength(val value, const char *error_message) {
    val length_value;

    if(value.isNull() || value.isUndefined()) {
      throw std::runtime_error(error_message);
    }

    length_value = value["length"];
    if(length_value.isUndefined() || length_value.isNull()) {
      throw std::runtime_error(error_message);
    }

    return length_value.as<std::size_t>();
  }

  Matrix matrixFromJsPointArray(val js_rows, const char* array_error,
      const char* row_error) {
    Matrix result;
    std::size_t row_count = getArrayLength(js_rows, array_error);
    std::size_t i;
    std::size_t j;

    result.resize(static_cast<uint32_t>(row_count), 3);
    for(i = 0; i < row_count; i++) {
      val row = js_rows[i];
      if(getArrayLength(row, row_error) != 3) {
        throw std::runtime_error(row_error);
      }
      for(j = 0; j < 3; j++) {
        result(static_cast<uint32_t>(i), static_cast<uint32_t>(j)) =
          row[j].as<double>();
      }
    }

    return result;
  }

  AlphaShape3DCore core;
};

EMSCRIPTEN_BINDINGS(alpha_shape_3d_module) {
  class_<AlphaShape3D>("AlphaShape3D")
    .constructor<>()
    .function("newShape", &AlphaShape3D::newShape)
    .function("getAlpha", &AlphaShape3D::getAlpha)
    .function("setAlpha", &AlphaShape3D::setAlpha)
    .function("getNumRegions", &AlphaShape3D::getNumRegions)
    .function("getAlphaSpectrum", &AlphaShape3D::getAlphaSpectrum)
    .function("getCriticalAlpha", &AlphaShape3D::getCriticalAlpha)
    .function("getSurfaceArea", &AlphaShape3D::getSurfaceArea)
    .function("getVolume", &AlphaShape3D::getVolume)
    .function("getBoundaryFacets", &AlphaShape3D::getBoundaryFacets);
}

}  // namespace alpha_shape_3d_wasm_ns
