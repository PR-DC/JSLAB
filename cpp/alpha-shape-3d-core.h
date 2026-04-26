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
#include <fstream>
#include <limits>
#include <list>
#include <sstream>
#include <string>
#include <utility>
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

namespace alpha_shape_3d_core {

namespace SMS = CGAL::Surface_mesh_simplification;
namespace PMP = CGAL::Polygon_mesh_processing;

typedef CGAL::Exact_predicates_inexact_constructions_kernel Gt;
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
    const std::vector<Point>& points;

  public:
    typedef Point value_type;
    typedef const value_type& reference;
    typedef std::size_t key_type;
    typedef boost::lvalue_property_map_tag category;

    search_map(const std::vector<Point>& pts) : points(pts) {}

    reference operator[](key_type k) const {
      return points[k];
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
    CustomMatrix(uint32_t r, uint32_t c) : rows(r), cols(c), data(r * c) {}

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
      rows = r;
      cols = c;
      data.resize(r * c);
    }
};

typedef CustomMatrix<double> Matrix;

class AlphaShape3DCore {
  public:
    AlphaShape3DCore() {
      alpha_shape = nullptr;
      delaunay_triangulation = nullptr;
      num_alpha_values = 0;
    }

    ~AlphaShape3DCore() {
      clearShape();
    }

    void newShape(const Matrix& points_in) {
      uint32_t n = points_in.numRows();
      uint64_t i_idx = 0;
      std::size_t i;

      clearShape();
      input_points = points_in;
      shape_points.clear();
      indexed_points.clear();
      surface_mesh.clear();
      shape_points.reserve(n);
      indexed_points.reserve(n);

      for(i = 0; i < n; i++) {
        shape_points.emplace_back(Point(
          input_points(i, 0),
          input_points(i, 1),
          input_points(i, 2)
        ));
        indexed_points.emplace_back(std::make_pair(
          shape_points.back(), static_cast<unsigned>(i)));
      }

      delaunay_triangulation = new Dt(indexed_points.begin(), indexed_points.end());
      triangulation_matrix.resize(
        delaunay_triangulation->number_of_finite_cells() * 4, 3);

      for(Dt::Finite_cells_iterator cit =
            delaunay_triangulation->finite_cells_begin();
          cit != delaunay_triangulation->finite_cells_end(); cit++) {
        triangulation_matrix(i_idx, 0) = cit->vertex(0)->info();
        triangulation_matrix(i_idx, 1) = cit->vertex(1)->info();
        triangulation_matrix(i_idx, 2) = cit->vertex(2)->info();
        i_idx++;
        triangulation_matrix(i_idx, 0) = cit->vertex(0)->info();
        triangulation_matrix(i_idx, 1) = cit->vertex(2)->info();
        triangulation_matrix(i_idx, 2) = cit->vertex(3)->info();
        i_idx++;
        triangulation_matrix(i_idx, 0) = cit->vertex(1)->info();
        triangulation_matrix(i_idx, 1) = cit->vertex(2)->info();
        triangulation_matrix(i_idx, 2) = cit->vertex(3)->info();
        i_idx++;
        triangulation_matrix(i_idx, 0) = cit->vertex(0)->info();
        triangulation_matrix(i_idx, 1) = cit->vertex(1)->info();
        triangulation_matrix(i_idx, 2) = cit->vertex(3)->info();
        i_idx++;
      }

      alpha_shape = new As3(*delaunay_triangulation, As3::GENERAL);
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
        int32_t indices[3] = {
          static_cast<int32_t>((boundary_facets[i].second + 1) % 4),
          static_cast<int32_t>((boundary_facets[i].second + 2) % 4),
          static_cast<int32_t>((boundary_facets[i].second + 3) % 4)
        };

        if(alpha_shape->classify(boundary_facets[i].first) != As3::EXTERIOR) {
          boundary_facets[i] = alpha_shape->mirror_facet(boundary_facets[i]);
        }
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
      return PMP::area(surface_mesh);
    }

    double getVolume() const {
      return PMP::volume(surface_mesh);
    }

    Matrix getBoundaryFacets() const {
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

    Matrix getBoundaryFacets(const std::string& filename) const {
      Matrix facets = getBoundaryFacets();
      writeOff(filename, input_points, facets);
      return facets;
    }

    void writeBoundaryFacets(const std::string& filename) const {
      writeOff(filename, input_points, getBoundaryFacets());
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
      return triangulation_matrix;
    }

    std::pair<Matrix, Matrix> getNearestNeighbor(const Matrix& query_points) const {
      Matrix indices(query_points.numRows(), 1);
      Matrix distances(query_points.numRows(), 1);
      Mesh surface_mesh_s(surface_mesh);
      std::vector<Point> surface_points;
      std::vector<uint32_t> vertex_indices;
      uint32_t i;

      PMP::remove_isolated_vertices(surface_mesh_s);

      for(Mesh::Vertex_index vertex_index : CGAL::vertices(surface_mesh_s)) {
        if(!surface_mesh_s.is_removed(vertex_index)) {
          surface_points.push_back(surface_mesh_s.point(vertex_index));
          vertex_indices.push_back(vertex_index);
        }
      }

      search_map surface_map(surface_points);
      Tree tree(boost::counting_iterator<std::size_t>(0),
        boost::counting_iterator<std::size_t>(CGAL::vertices(surface_mesh_s).size()),
        Tree::Splitter(), Traits(surface_map));
      K_neighbor_search::Distance surface_dist(surface_map);

      for(i = 0; i < query_points.numRows(); i++) {
        K_neighbor_search search(tree, Point(
          query_points(i, 0),
          query_points(i, 1),
          query_points(i, 2)),
          1, 0, true, surface_dist);
        indices(i, 0) = vertex_indices[search.begin()->first];
        distances(i, 0) =
          surface_dist.inverse_of_transformed_distance(search.begin()->second);
      }

      return std::make_pair(indices, distances);
    }

    std::pair<Matrix, Matrix> getSimplifiedShape(double stop_ratio) const {
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
          surface_mesh_s.halfedge(face_index), surface_mesh);
        facets_out(face_index.idx(), 0) = *vcirc++;
        facets_out(face_index.idx(), 1) = *vcirc++;
        facets_out(face_index.idx(), 2) = *vcirc++;
      }

      return std::make_pair(points_out, facets_out);
    }

    std::pair<Matrix, Matrix> getSimplifiedShape() const {
      return getSimplifiedShape(0.05);
    }

    std::pair<Matrix, Matrix> getSimplifiedShape(const std::string& filename) const {
      std::pair<Matrix, Matrix> result = getSimplifiedShape(0.05);
      writeOff(filename, result.first, result.second);
      return result;
    }

    std::pair<Matrix, Matrix> getSimplifiedShape(double stop_ratio,
        const std::string& filename) const {
      std::pair<Matrix, Matrix> result = getSimplifiedShape(stop_ratio);
      writeOff(filename, result.first, result.second);
      return result;
    }

    std::pair<Matrix, Matrix> removeUnusedPoints(const Matrix& input_points_matrix,
        const Matrix& boundary_facets) const {
      Mesh surface_mesh_s;
      std::vector<CGAL_Polygon> polygons;
      CGAL_Polygon polygon;
      std::vector<Point> points_in;
      Matrix points_out;
      Matrix facets_out;
      std::size_t i;

      for(i = 0; i < input_points_matrix.numRows(); i++) {
        points_in.push_back(Point(
          input_points_matrix(i, 0),
          input_points_matrix(i, 1),
          input_points_matrix(i, 2)
        ));
      }

      for(i = 0; i < boundary_facets.numRows(); i++) {
        polygon.clear();
        for(uint8_t j = 0; j < 3; j++) {
          polygon.push_back(boundary_facets(i, j));
        }
        polygons.push_back(polygon);
      }

      PMP::orient_polygon_soup(points_in, polygons);
      PMP::repair_polygon_soup(points_in, polygons);
      PMP::polygon_soup_to_polygon_mesh(points_in, polygons, surface_mesh_s);
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
          surface_mesh_s.halfedge(face_index), surface_mesh);
        facets_out(face_index.idx(), 0) = *vcirc++;
        facets_out(face_index.idx(), 1) = *vcirc++;
        facets_out(face_index.idx(), 2) = *vcirc++;
      }

      return std::make_pair(points_out, facets_out);
    }

    void writeOff(const std::string& filename, const Matrix& points_matrix,
        const Matrix& boundary_facets) const {
      uint32_t n = points_matrix.numRows();
      uint32_t nbf = boundary_facets.numRows();
      std::stringstream pts;
      std::stringstream ind;
      std::size_t i;
      std::ofstream of(filename);

      for(i = 0; i < n; i++) {
        pts << points_matrix(i, 0) << " " << points_matrix(i, 1) << " " <<
          points_matrix(i, 2) << std::endl;
      }

      for(i = 0; i < nbf; i++) {
        ind << "3 " << static_cast<uint64_t>(boundary_facets(i, 0)) << " " <<
          static_cast<uint64_t>(boundary_facets(i, 1)) << " " <<
          static_cast<uint64_t>(boundary_facets(i, 2)) << std::endl;
      }

      CGAL::set_ascii_mode(of);
      of << "OFF" << std::endl << n << " " << nbf << " 0" << std::endl;
      of << pts.str();
      of << ind.str();
      of.close();
    }

  private:
    void clearShape() {
      if(delaunay_triangulation) {
        delete delaunay_triangulation;
        delaunay_triangulation = nullptr;
      }
      if(alpha_shape) {
        delete alpha_shape;
        alpha_shape = nullptr;
      }
    }

    void ensureShape() const {
      assert(alpha_shape != nullptr);
    }

    Matrix input_points;
    std::vector<Point> shape_points;
    std::vector<std::pair<Point, unsigned> > indexed_points;
    As3* alpha_shape;
    Dt* delaunay_triangulation;
    Matrix triangulation_matrix;
    std::size_t num_alpha_values;
    Mesh surface_mesh;
};

} // namespace alpha_shape_3d_core

#endif // ALPHA_SHAPE_3D_CORE_H
