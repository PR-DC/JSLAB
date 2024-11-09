// AlphaShape3D - alpha-shape-3d.h
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// info@prdc.rs
// --------------------

#ifndef ALPHA_SHAPE_3D_H
#define ALPHA_SHAPE_3D_H

//#define DEBUG_ALPHA_SHAPE_3D
//#define DEBUG_ALPHA_SHAPE_3D_LEVEL 0
//#define PROFILE_ALPHA_SHAPE_3D

#include <napi.h>
#include <chrono>
#include <thread>
#include <Windows.h>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <string>
#include <fstream>
#include <iostream>
#include <filesystem>
#include <cassert>
#include <list>
#include <vector>

#include <CGAL/Exact_predicates_inexact_constructions_kernel.h>

#include <CGAL/Delaunay_triangulation_3.h>
#include <CGAL/Triangulation_vertex_base_with_info_3.h>
#include <CGAL/Alpha_shape_3.h>
#include <CGAL/Alpha_shape_cell_base_3.h>
#include <CGAL/Alpha_shape_vertex_base_3.h>

#include <CGAL/Surface_mesh.h>
#include <CGAL/Surface_mesh_simplification/edge_collapse.h>
#include <CGAL/Surface_mesh_simplification/Policies/Edge_collapse/Edge_count_ratio_stop_predicate.h>

#include <CGAL/Polygon_mesh_processing/repair_polygon_soup.h>
#include <CGAL/Polygon_mesh_processing/orient_polygon_soup.h>
#include <CGAL/Polygon_mesh_processing/polygon_soup_to_polygon_mesh.h>
#include <CGAL/Polygon_mesh_processing/measure.h>
#include <CGAL/Polygon_mesh_processing/repair.h>

#include <CGAL/Search_traits_3.h>
#include <CGAL/Search_traits_adapter.h>
#include <CGAL/Orthogonal_k_neighbor_search.h>
#include <CGAL/boost/iterator/counting_iterator.hpp>

namespace alpha_shape_3d_ns {

using namespace std;
using namespace std::chrono;

namespace SMS = CGAL::Surface_mesh_simplification;
namespace PMP = CGAL::Polygon_mesh_processing;

typedef CGAL::Exact_predicates_inexact_constructions_kernel Gt;

typedef CGAL::Triangulation_vertex_base_with_info_3<unsigned, Gt> Tvb;
typedef CGAL::Alpha_shape_vertex_base_3<Gt, Tvb> Vb;
typedef CGAL::Alpha_shape_cell_base_3<Gt> Fb;
typedef CGAL::Triangulation_data_structure_3<Vb, Fb> Tds;
typedef CGAL::Delaunay_triangulation_3<Gt, Tds, CGAL::Fast_location> Dt;
typedef Dt::Point Point;

class search_map {
    const std::vector<Point>& points;
  public:
    typedef Point value_type;
    typedef const value_type& reference;
    typedef std::size_t key_type;
    typedef boost::lvalue_property_map_tag category;
    search_map(const std::vector<Point>& pts):points(pts){}
    reference operator[](key_type k) const {return points[k];}
    friend reference get(const search_map& ppmap, key_type i)
    {return ppmap[i];}
};

typedef CGAL::Alpha_shape_3<Dt> As3;
typedef CGAL::Surface_mesh<Point> Mesh;
typedef std::vector<std::size_t> CGAL_Polygon;

typedef CGAL::Search_traits_3<Gt> Trb;
typedef CGAL::Search_traits_adapter<std::size_t, search_map, Trb> Traits;
typedef CGAL::Orthogonal_k_neighbor_search<Traits>  K_neighbor_search;
typedef K_neighbor_search::Tree Tree;

template <typename T>
class CustomMatrix {
  private:
    std::vector<T> data;
    uint32_t rows;
    uint32_t cols;

  public:
    CustomMatrix() : rows(0), cols(0) {}
    CustomMatrix(uint32_t r, uint32_t c) : rows(r), cols(c), data(r * c) {}

    T& operator()(uint32_t i, uint32_t j) {
      return data[i * cols + j];
    }

    const T& operator()(uint32_t i, uint32_t j) const {
      return data[i * cols + j];
    }

    uint32_t numRows() const { return rows; }
    uint32_t numCols() const { return cols; }

    void resize(uint32_t r, uint32_t c) {
      rows = r;
      cols = c;
      data.resize(r * c);
    }
};
typedef CustomMatrix<double> Matrix;

class AlphaShape3D : public Napi::ObjectWrap<AlphaShape3D> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  AlphaShape3D(const Napi::CallbackInfo& info);
  ~AlphaShape3D();

  Matrix inputPoints;
  std::vector<Point> Points;
  std::vector<std::pair<Point, unsigned>> Vertices;
  double getAlpha(void); 
  void setAlpha(double); 
  double numRegions(void);
  Matrix getAlphaSpectrum(void); 
  double getCriticalAlpha(std::string);
  double getSurfaceArea(void);
  double getVolume(void);
  Matrix getBoundaryFacets(void);
  Matrix getBoundaryFacets(std::string);
  void writeBoundaryFacets(std::string);
  Matrix checkInShape(Matrix);
  Matrix getTriangulation(void);
  std::pair<Matrix, Matrix> getNearestNeighbor(Matrix);
  std::pair<Matrix, Matrix> getSimplifiedShape(double);
  std::pair<Matrix, Matrix> getSimplifiedShape();
  std::pair<Matrix, Matrix> getSimplifiedShape(std::string);
  std::pair<Matrix, Matrix> getSimplifiedShape(double, std::string);
  std::pair<Matrix, Matrix> removeUnusedPoints(Matrix, Matrix);
  void writeOff(std::string, Matrix, Matrix);

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
  As3 *alphaShape;
  Dt *delaunayTriangulation;
  Matrix triangulationMatrix;
  std::size_t numAlphaValues;
  Mesh surface_mesh;
};

}// namespace alpha_shape_3d_ns

#endif // ALPHA_SHAPE_3D_H