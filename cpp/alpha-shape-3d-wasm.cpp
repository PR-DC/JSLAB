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
using alpha_shape_3d_core::Point;

class AlphaShape3D {
 public:
  AlphaShape3D() {}
  ~AlphaShape3D() {}

  void newShape(val js_points) {
    std::size_t count = getArrayLength(js_points, "Array of points expected");
    std::vector<Point> points;
    if(count < 4 || count > points.max_size()) {
      throw std::invalid_argument("At least four noncoplanar points are required; node count is out of range");
    }
    points.reserve(count);
    for(std::size_t i = 0; i < count; ++i) {
      val row = js_points[i];
      if(getArrayLength(row, "Each point should have exactly 3 coordinates") != 3) {
        throw std::invalid_argument("Each point should have exactly 3 coordinates");
      }
      points.emplace_back(coordinateFromJs(row[0]), coordinateFromJs(row[1]), coordinateFromJs(row[2]));
    }
    core.newShape(std::move(points));
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

  val getPoints() {
    val output = val::array();
    for(const Point& point : core.getPoints()) {
      val row = val::array();
      for(uint32_t j = 0; j < 3; ++j) row.call<void>("push", point[j]);
      output.call<void>("push", row);
    }
    return output;
  }

  val checkInShape(val points) {
    Matrix result = core.checkInShape(matrixFromJsPointArray(points,
      "Array expected", "Each point should have exactly 3 coordinates"));
    val output = val::array();
    for(uint32_t i = 0; i < result.numRows(); i++) {
      output.call<void>("push", result(i, 0) != 0);
    }
    return output;
  }

  val getTriangulation() {
    return matrixToJs(core.getTriangulation());
  }

  val getNearestNeighbor(val points) {
    auto result = core.getNearestNeighbor(matrixFromJsPointArray(points,
      "Array expected", "Each point should have exactly 3 coordinates"));
    val output = val::object();
    val indices = val::array();
    val distances = val::array();
    for(uint32_t i = 0; i < result.first.numRows(); i++) {
      indices.call<void>("push", result.first(i, 0));
      distances.call<void>("push", result.second(i, 0));
    }
    output.set("indices", indices);
    output.set("distances", distances);
    return output;
  }

  val getSimplifiedShape(double ratio) {
    return meshToJs(core.getSimplifiedShape(ratio));
  }

  val removeUnusedPoints(val points, val facets) {
    return meshToJs(core.removeUnusedPoints(
      matrixFromJsPointArray(points, "Array expected", "Three coordinates required"),
      matrixFromJsPointArray(facets, "Array expected", "Three indices required")));
  }

 private:
  val matrixToJs(const Matrix& matrix) {
    val output = val::array();
    for(uint32_t i = 0; i < matrix.numRows(); i++) {
      val row = val::array();
      for(uint32_t j = 0; j < matrix.numCols(); j++) {
        row.call<void>("push", matrix(i, j));
      }
      output.call<void>("push", row);
    }
    return output;
  }

  val meshToJs(const std::pair<Matrix, Matrix>& mesh) {
    val output = val::object();
    output.set("points", matrixToJs(mesh.first));
    output.set("facets", matrixToJs(mesh.second));
    return output;
  }
  std::size_t getArrayLength(val value, const char *error_message) {
    if(!val::global("Array").call<bool>("isArray", value)) {
      throw std::runtime_error(error_message);
    }
    return value["length"].as<std::size_t>();
  }

  double coordinateFromJs(val value) {
    if(value.typeOf().as<std::string>() != "number") {
      throw std::invalid_argument("Coordinates must be finite numbers");
    }
    double coordinate = value.as<double>();
    if(!std::isfinite(coordinate)) {
      throw std::invalid_argument("Coordinates must be finite numbers");
    }
    return coordinate;
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
          coordinateFromJs(row[j]);
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
    .function("getBoundaryFacets", &AlphaShape3D::getBoundaryFacets)
    .function("getPoints", &AlphaShape3D::getPoints)
    .function("checkInShape", &AlphaShape3D::checkInShape)
    .function("getTriangulation", &AlphaShape3D::getTriangulation)
    .function("getNearestNeighbor", &AlphaShape3D::getNearestNeighbor)
    .function("getSimplifiedShape", &AlphaShape3D::getSimplifiedShape)
    .function("removeUnusedPoints", &AlphaShape3D::removeUnusedPoints);
}

}  // namespace alpha_shape_3d_wasm_ns
