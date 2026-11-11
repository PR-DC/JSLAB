// AlphaShape3D - alpha-shape-3d-core.h
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// info@prdc.rs
// --------------------

#ifndef ALPHA_SHAPE_3D_CORE_H
#define ALPHA_SHAPE_3D_CORE_H

#include <algorithm>
#include <cassert>
#include <cstdint>
#include <cmath>
#include <limits>
#include <list>
#include <memory>
#include <string>
#include <stdexcept>
#include <utility>
#include <vector>

#include <CGAL/Exact_predicates_inexact_constructions_kernel.h>
#include <CGAL/Robust_weighted_circumcenter_filtered_traits_3.h>

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
#include <boost/iterator/transform_iterator.hpp>

namespace alpha_shape_3d_core {

namespace SMS = CGAL::Surface_mesh_simplification;
namespace PMP = CGAL::Polygon_mesh_processing;

// Use exact radius constructions only when a near-degenerate tetrahedron's
// floating-point denominator vanishes despite its exact orientation being 3D.
typedef CGAL::Robust_circumcenter_filtered_traits_3<
  CGAL::Exact_predicates_inexact_constructions_kernel> Gt;
typedef CGAL::Triangulation_vertex_base_with_info_3<unsigned, Gt> Tvb;
typedef CGAL::Alpha_shape_vertex_base_3<Gt, Tvb> Vb;
typedef CGAL::Alpha_shape_cell_base_3<Gt> Fb;
typedef CGAL::Triangulation_data_structure_3<Vb, Fb> Tds;
typedef CGAL::Delaunay_triangulation_3<Gt, Tds, CGAL::Fast_location> Dt;
typedef Dt::Point Point;
typedef CGAL::Alpha_shape_3<Dt> As3;
typedef CGAL::Surface_mesh<Point> Mesh;
typedef std::vector<std::size_t> CGAL_Polygon;

class search_map {
  private:
    const Mesh& mesh;

  public:
    typedef Point value_type;
    typedef const value_type& reference;
    typedef std::size_t key_type;
    typedef boost::lvalue_property_map_tag category;

    search_map(const Mesh& mesh_in) : mesh(mesh_in) {}

    reference operator[](key_type k) const {
      return mesh.point(Mesh::Vertex_index(k));
    }

    friend reference get(const search_map& ppmap, key_type i) {
      return ppmap[i];
    }
};

typedef CGAL::Search_traits_3<Gt> Trb;
typedef CGAL::Search_traits_adapter<std::size_t, search_map, Trb> Traits;
typedef CGAL::Orthogonal_k_neighbor_search<Traits> K_neighbor_search;
typedef K_neighbor_search::Tree Tree;

template <typename T>
class CustomMatrix {
  private:
    std::vector<T> data;
    uint32_t rows;
    uint32_t cols;

  public:
    CustomMatrix() : rows(0), cols(0) {}
    CustomMatrix(uint32_t r, uint32_t c) : rows(0), cols(0) {
      resize(r, c);
    }

    T& operator()(uint32_t i, uint32_t j) {
      return data[i * cols + j];
    }

    const T& operator()(uint32_t i, uint32_t j) const {
      return data[i * cols + j];
    }

    uint32_t numRows() const {
      return rows;
    }

    uint32_t numCols() const {
      return cols;
    }

    void resize(uint32_t r, uint32_t c) {
      if(c != 0 && r > data.max_size() / c) {
        throw std::length_error("Matrix dimensions exceed the supported node count");
      }
      data.resize(static_cast<std::size_t>(r) * c);
      rows = r;
      cols = c;
    }
};

typedef CustomMatrix<double> Matrix;

class AlphaShape3DCore {
  public:
    AlphaShape3DCore() {
      num_alpha_values = 0;
    }

    // Keep one owned point buffer and provide indexed points to CGAL on demand.
    // Validate before replacing the current shape so a bad node count or a
    // degenerate cloud cannot leave a partially initialized native object.
    void newShape(std::vector<Point> points_in) {
      const std::size_t n = points_in.size();
      if(n < 4 || n > std::numeric_limits<unsigned>::max()) {
        throw std::invalid_argument("At least four noncoplanar points are required; node count is out of range");
      }
      for(const Point& point : points_in) {
        if(!std::isfinite(point[0]) || !std::isfinite(point[1]) || !std::isfinite(point[2])) {
          throw std::invalid_argument("Coordinates must be finite numbers");
        }
      }
      auto indexed_point = [&points_in](std::size_t index) {
        return std::make_pair(points_in[index], static_cast<unsigned>(index));
      };
      auto first = boost::make_transform_iterator(
        boost::counting_iterator<std::size_t>(0), indexed_point);
      auto last = boost::make_transform_iterator(
        boost::counting_iterator<std::size_t>(n), indexed_point);
      Dt triangulation(first, last);
      if(triangulation.dimension() != 3) {
        throw std::invalid_argument("At least four noncoplanar points are required");
      }
      // Alpha_shape_3 takes ownership of the triangulation by swapping it.
      auto next_shape = std::make_unique<As3>(triangulation);
      surface_mesh.clear();
      shape_points = std::move(points_in);
      alpha_shape = std::move(next_shape);
      num_alpha_values = alpha_shape->number_of_alphas();
    }

    double getAlpha() const {
      ensureShape();
      return alpha_shape->get_alpha();
    }

    void setAlpha(double alpha) {
      std::vector<As3::Facet> boundary_facets;
      std::vector<CGAL_Polygon> polygons;
      CGAL_Polygon polygon;
      std::size_t i;

      ensureShape();
      surface_mesh.clear();
      alpha_shape->set_alpha(alpha);

      alpha_shape->get_alpha_shape_facets(std::back_inserter(boundary_facets),
        As3::REGULAR);
      polygons.reserve(boundary_facets.size());

      for(i = 0; i < boundary_facets.size(); i++) {
        if(alpha_shape->classify(boundary_facets[i].first) != As3::EXTERIOR) {
          boundary_facets[i] = alpha_shape->mirror_facet(boundary_facets[i]);
        }
        int32_t indices[3] = {
          static_cast<int32_t>((boundary_facets[i].second + 1) % 4),
          static_cast<int32_t>((boundary_facets[i].second + 2) % 4),
          static_cast<int32_t>((boundary_facets[i].second + 3) % 4)
        };

        if(boundary_facets[i].second % 2 == 0) {
          std::swap(indices[0], indices[1]);
        }

        polygon.clear();
        for(uint8_t j = 0; j < 3; j++) {
          polygon.push_back(boundary_facets[i].first->vertex(indices[j])->info());
        }
        polygons.push_back(polygon);
      }

      PMP::polygon_soup_to_polygon_mesh(shape_points, polygons, surface_mesh);
    }

    double numRegions() const {
      ensureShape();
      return alpha_shape->number_of_solid_components();
    }

    Matrix getAlphaSpectrum() const {
      Matrix alpha_values(1, static_cast<uint32_t>(num_alpha_values));
      uint32_t i;

      ensureShape();
      for(i = 0; i < num_alpha_values; i++) {
        alpha_values(0, i) = alpha_shape->get_nth_alpha(i + 1);
      }
      return alpha_values;
    }

    double getCriticalAlpha(const std::string& type) const {
      ensureShape();
      if(type == "all-points") {
        return alpha_shape->find_alpha_solid();
      }
      if(type == "one-region") {
        return *alpha_shape->find_optimal_alpha(1);
      }
      return std::numeric_limits<double>::quiet_NaN();
    }

    double getSurfaceArea() const {
      ensureShape();
      return PMP::area(surface_mesh);
    }

    double getVolume() const {
      ensureShape();
      return PMP::volume(surface_mesh);
    }

    Matrix getBoundaryFacets() const {
      ensureShape();
      Matrix facets(surface_mesh.number_of_faces(), 3);

      for(Mesh::Face_index face_index : surface_mesh.faces()) {
        CGAL::Vertex_around_face_circulator<Mesh> vcirc(
          surface_mesh.halfedge(face_index), surface_mesh);
        facets(face_index.idx(), 0) = *vcirc++;
        facets(face_index.idx(), 1) = *vcirc++;
        facets(face_index.idx(), 2) = *vcirc++;
      }
      return facets;
    }

    Matrix checkInShape(const Matrix& query_points) const {
      Matrix result(query_points.numRows(), 1);
      uint32_t i;

      ensureShape();
      for(i = 0; i < query_points.numRows(); i++) {
        result(i, 0) = alpha_shape->classify(Point(
          query_points(i, 0),
          query_points(i, 1),
          query_points(i, 2)
        ));
      }
      return result;
    }

    Matrix getTriangulation() const {
      ensureShape();
      const std::size_t cells = alpha_shape->number_of_finite_cells();
      if(cells > std::numeric_limits<uint32_t>::max() / 4) {
        throw std::length_error("Triangulation exceeds the supported node count");
      }
      Matrix triangulation_matrix(static_cast<uint32_t>(cells * 4), 3);
      uint32_t row = 0;
      const uint8_t vertices[4][3] = {{0, 1, 2}, {0, 2, 3}, {1, 2, 3}, {0, 1, 3}};
      for(auto cell = alpha_shape->finite_cells_begin(); cell != alpha_shape->finite_cells_end(); ++cell) {
        for(uint8_t face = 0; face < 4; ++face, ++row) {
          for(uint8_t coordinate = 0; coordinate < 3; ++coordinate) {
            triangulation_matrix(row, coordinate) = cell->vertex(vertices[face][coordinate])->info();
          }
        }
      }
      return triangulation_matrix;
    }

    const std::vector<Point>& getPoints() const {
      ensureShape();
      return shape_points;
    }

    std::pair<Matrix, Matrix> getNearestNeighbor(const Matrix& query_points) const {
      Matrix indices(query_points.numRows(), 1);
      Matrix distances(query_points.numRows(), 1);
      std::vector<std::size_t> vertex_indices;
      uint32_t i;

      ensureShape();
      vertex_indices.reserve(surface_mesh.number_of_vertices());
      for(Mesh::Vertex_index vertex_index : surface_mesh.vertices()) {
        if(!surface_mesh.is_isolated(vertex_index)) {
          vertex_indices.push_back(vertex_index.idx());
        }
      }
      if(vertex_indices.empty()) {
        throw std::runtime_error("Set alpha to produce a nonempty boundary before querying neighbors");
      }

      search_map surface_map(surface_mesh);
      Tree tree(vertex_indices.begin(), vertex_indices.end(),
        Tree::Splitter(), Traits(surface_map));
      K_neighbor_search::Distance surface_dist(surface_map);

      for(i = 0; i < query_points.numRows(); i++) {
        K_neighbor_search search(tree, Point(
          query_points(i, 0),
          query_points(i, 1),
          query_points(i, 2)),
          1, 0, true, surface_dist);
        indices(i, 0) = search.begin()->first;
        distances(i, 0) =
          surface_dist.inverse_of_transformed_distance(search.begin()->second);
      }

      return std::make_pair(std::move(indices), std::move(distances));
    }

    std::pair<Matrix, Matrix> getSimplifiedShape(double stop_ratio) const {
      ensureShape();
      Mesh surface_mesh_s(surface_mesh);
      SMS::Edge_count_ratio_stop_predicate<Mesh> stop(stop_ratio);
      Matrix points_out;
      Matrix facets_out;

      SMS::edge_collapse(surface_mesh_s, stop);
      PMP::remove_isolated_vertices(surface_mesh_s);
      surface_mesh_s.collect_garbage();

      points_out.resize(surface_mesh_s.number_of_vertices(), 3);
      facets_out.resize(surface_mesh_s.number_of_faces(), 3);

      for(Mesh::Vertex_index vertex_index : surface_mesh_s.vertices()) {
        Point p = surface_mesh_s.point(vertex_index);
        points_out(vertex_index.idx(), 0) = p[0];
        points_out(vertex_index.idx(), 1) = p[1];
        points_out(vertex_index.idx(), 2) = p[2];
      }

      for(Mesh::Face_index face_index : surface_mesh_s.faces()) {
        CGAL::Vertex_around_face_circulator<Mesh> vcirc(
          surface_mesh_s.halfedge(face_index), surface_mesh_s);
        facets_out(face_index.idx(), 0) = *vcirc++;
        facets_out(face_index.idx(), 1) = *vcirc++;
        facets_out(face_index.idx(), 2) = *vcirc++;
      }

      return std::make_pair(std::move(points_out), std::move(facets_out));
    }

    std::pair<Matrix, Matrix> getSimplifiedShape() const {
      return getSimplifiedShape(0.05);
    }

    std::pair<Matrix, Matrix> removeUnusedPoints(const Matrix& points,
        const Matrix& facets) const {
      std::vector<bool> used(points.numRows(), false);
      std::vector<uint32_t> remap(points.numRows(), 0);
      uint32_t count = 0;
      for(uint32_t i = 0; i < facets.numRows(); i++) {
        for(uint32_t j = 0; j < 3; j++) {
          double index = facets(i, j);
          if(index < 0 || index >= points.numRows() || std::floor(index) != index) {
            throw std::invalid_argument("Facet index is out of range");
          }
          used[static_cast<uint32_t>(index)] = true;
        }
      }
      for(uint32_t i = 0; i < points.numRows(); i++) {
        if(used[i]) remap[i] = count++;
      }
      Matrix output_points(count, 3);
      Matrix output_facets(facets.numRows(), 3);
      for(uint32_t i = 0; i < points.numRows(); i++) {
        if(used[i]) {
          for(uint32_t j = 0; j < 3; j++) output_points(remap[i], j) = points(i, j);
        }
      }
      for(uint32_t i = 0; i < facets.numRows(); i++) {
        for(uint32_t j = 0; j < 3; j++) {
          output_facets(i, j) = remap[static_cast<uint32_t>(facets(i, j))];
        }
      }
      return std::make_pair(std::move(output_points), std::move(output_facets));
    }

  private:
    void ensureShape() const {
      if(alpha_shape == nullptr) throw std::runtime_error("Shape has not been initialized");
    }

    std::vector<Point> shape_points;
    std::unique_ptr<As3> alpha_shape;
    std::size_t num_alpha_values;
    Mesh surface_mesh;
};

} // namespace alpha_shape_3d_core

#endif // ALPHA_SHAPE_3D_CORE_H
