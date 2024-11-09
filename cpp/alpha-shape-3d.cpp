// AlphaShape3D - alpha-shape-3d.cpp
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// info@prdc.rs
// --------------------

#include "alpha-shape-3d.h"

namespace alpha_shape_3d_ns {
  
#ifdef PROFILE_SOLVER_MP_6RSS
// Function to start the timer and return the start time
time_point<steady_clock> tic() {
  return steady_clock::now();
}

// Function to stop the timer and return the elapsed time
long toc(const time_point<steady_clock>& startTime) {
  return duration_cast<milliseconds>(steady_clock::now() - startTime).count();
}
#endif

// Function to get current time
std::string getCurrentTime() {
  // get current time
  auto now = system_clock::now();

  // get number of milliseconds for the current second
  // (remainder after division into seconds)
  auto ms = duration_cast<milliseconds>(now.time_since_epoch()) % 1000;

  // convert to std::time_t in order to convert to std::tm (broken time)
  auto timer = system_clock::to_time_t(now);

  // convert to broken time
  std::tm bt = *std::localtime(&timer);

  std::ostringstream oss;

  oss << std::put_time(&bt, "%H:%M:%S"); // HH:MM:SS
  oss << '.' << std::setfill('0') << std::setw(3) << ms.count();

  return oss.str();
}

// Function to console log data
int consoleLog(uint8_t level, const char* format, ...) {
#ifdef DEBUG_SOLVER_MP_6RSS_LEVEL
  if(level <= DEBUG_SOLVER_MP_6RSS_LEVEL) {
    printf("\033[0;33m[%s SolverMP6RSS]\033[0m ", getCurrentTime().c_str());
    va_list vl;
    va_start(vl, format);
    auto ret = vprintf(format, vl);
    va_end(vl);
    printf("\n");
    return ret;
  }
#endif
  return 0;
}

// AlphaShape3D()
// Object constructor
// --------------------
AlphaShape3D::AlphaShape3D(const Napi::CallbackInfo& info) : Napi::ObjectWrap<AlphaShape3D>(info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called constructor");
#endif
  this->alphaShape = nullptr;
  this->delaunayTriangulation = nullptr;
}

// ~AlphaShape3D()
// Object destructor
// --------------------
AlphaShape3D::~AlphaShape3D(void) {
  if(this->delaunayTriangulation){
    delete this->delaunayTriangulation;
    this->delaunayTriangulation = nullptr;
  }
  if(this->alphaShape){
    delete this->alphaShape;
    this->alphaShape = nullptr;
  }
}

// Init() function
// --------------------
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

// NewShapeJS() function
// --------------------
void AlphaShape3D::NewShapeJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called NewShapeJS()");
#endif

  Napi::Env env = info.Env();
  if(info.Length() < 1 || !info[0].IsArray()){
    Napi::TypeError::New(env, "Array of points expected").ThrowAsJavaScriptException();
    return;
  }

  Napi::Array jsPoints = info[0].As<Napi::Array>();
  uint32_t numPoints = jsPoints.Length();

  // Clear existing data to prevent accumulation
  this->inputPoints.resize(0, 0);
  this->Points.clear();
  this->Vertices.clear();

  // Initialize inputPoints matrix
  this->inputPoints.resize(numPoints, 3);

  for(uint32_t i = 0; i < numPoints; i++){
    Napi::Value point = jsPoints[i];
    if(!point.IsArray()){
      Napi::TypeError::New(env, "Each point should be an array of 3 numbers").ThrowAsJavaScriptException();
      return;
    }
    Napi::Array jsPoint = point.As<Napi::Array>();
    if(jsPoint.Length() != 3){
      Napi::TypeError::New(env, "Each point should have exactly 3 coordinates").ThrowAsJavaScriptException();
      return;
    }

    for(uint32_t j = 0; j < 3; j++){
      this->inputPoints(i, j) = jsPoint.Get(j).As<Napi::Number>().DoubleValue();
    }
  }

#ifdef DEBUG_ALPHA_SHAPE_3D  
  std::chrono::steady_clock::time_point begin = 
    std::chrono::steady_clock::now();
#endif

  uint32_t n = this->inputPoints.numRows();

#ifdef DEBUG_ALPHA_SHAPE_3D
  std::cout << "Reading " << n << " points " << std::endl;
#endif

  for(std::size_t i = 0; i < n; i++){
    this->Points.emplace_back(
      Point(this->inputPoints(i, 0), this->inputPoints(i, 1), this->inputPoints(i, 2)));
    this->Vertices.emplace_back(std::make_pair(this->Points.back(), i));
  }

#ifdef DEBUG_ALPHA_SHAPE_3D
  std::cout << "Computing delaunay triangulation." << std::endl;
#endif

  // Delete existing triangulation and alphaShape to prevent memory leaks
  if(this->delaunayTriangulation){
    delete this->delaunayTriangulation;
    this->delaunayTriangulation = nullptr;
  }
  if(this->alphaShape){
    delete this->alphaShape;
    this->alphaShape = nullptr;
  }

  this->delaunayTriangulation = new Dt(this->Vertices.begin(), this->Vertices.end());

#ifdef DEBUG_ALPHA_SHAPE_3D
  std::cout << "Number of triangulation cells is " 
            << this->delaunayTriangulation->number_of_finite_cells() << std::endl;
#endif

  this->triangulationMatrix.resize(this->delaunayTriangulation->number_of_finite_cells()*4, 3);
  uint64_t i_idx = 0;
  for(Dt::Finite_cells_iterator cit = this->delaunayTriangulation->finite_cells_begin();
        cit != this->delaunayTriangulation->finite_cells_end(); cit++){
    this->triangulationMatrix(i_idx, 0) = cit->vertex(0)->info();
    this->triangulationMatrix(i_idx, 1) = cit->vertex(1)->info();
    this->triangulationMatrix(i_idx, 2) = cit->vertex(2)->info();
    i_idx++;
    this->triangulationMatrix(i_idx, 0) = cit->vertex(0)->info();
    this->triangulationMatrix(i_idx, 1) = cit->vertex(2)->info();
    this->triangulationMatrix(i_idx, 2) = cit->vertex(3)->info();
    i_idx++;
    this->triangulationMatrix(i_idx, 0) = cit->vertex(1)->info();
    this->triangulationMatrix(i_idx, 1) = cit->vertex(2)->info();
    this->triangulationMatrix(i_idx, 2) = cit->vertex(3)->info();
    i_idx++;
    this->triangulationMatrix(i_idx, 0) = cit->vertex(0)->info();
    this->triangulationMatrix(i_idx, 1) = cit->vertex(1)->info();
    this->triangulationMatrix(i_idx, 2) = cit->vertex(3)->info();
    i_idx++;
  }
  
#ifdef DEBUG_ALPHA_SHAPE_3D
  std::cout << "Computing alpha shapes." << std::endl;
#endif
  this->alphaShape = new As3(*this->delaunayTriangulation, As3::GENERAL);

  this->numAlphaValues = this->alphaShape->number_of_alphas();

#ifdef DEBUG_ALPHA_SHAPE_3D
  std::cout << "Number of alpha values is " 
            << this->numAlphaValues << std::endl;
  std::cout << "Max alpha value is " 
            << this->alphaShape->get_nth_alpha(this->numAlphaValues) << std::endl;
  std::cout << "Min of alpha value is " 
            << this->alphaShape->get_nth_alpha(1) << std::endl;
#ifdef PROFILE_SOLVER_MP_6RSS
  std::chrono::steady_clock::time_point end = 
    std::chrono::steady_clock::now();
  std::cout << "Time elapsed = "
      << std::chrono::duration_cast<std::chrono::milliseconds> 
        (end - begin).count()
      << " ms" << std::endl;
#endif
#endif
}

// GetAlphaJS() function
// --------------------
Napi::Value AlphaShape3D::GetAlphaJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called GetAlphaJS()");
#endif

  Napi::Env env = info.Env();
  double result = this->getAlpha();
  return Napi::Number::New(env, result);
}

// SetAlphaJS() function
// --------------------
void AlphaShape3D::SetAlphaJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called SetAlphaJS()");
#endif

  Napi::Env env = info.Env();
  if(info.Length() < 1 || !info[0].IsNumber()){
    Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
  }
  double alpha = info[0].As<Napi::Number>().DoubleValue();
  this->setAlpha(alpha);
}

// GetNumRegionsJS() function
// --------------------
Napi::Value AlphaShape3D::GetNumRegionsJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called GetNumRegionsJS()");
#endif

  Napi::Env env = info.Env();
  double result = this->numRegions();
  return Napi::Number::New(env, result);
}

// GetAlphaSpectrumJS() function
// --------------------
Napi::Value AlphaShape3D::GetAlphaSpectrumJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called GetAlphaSpectrumJS()");
#endif

  Napi::Env env = info.Env();
  Matrix spectrum = this->getAlphaSpectrum();
  Napi::Array result = Napi::Array::New(env, spectrum.numCols());
  for(size_t i = 0; i < spectrum.numCols(); i++){
    result.Set(i, Napi::Number::New(env, spectrum(0, i)));
  }
  return result;
}

// GetCriticalAlphaJS() function
// --------------------
Napi::Value AlphaShape3D::GetCriticalAlphaJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called GetCriticalAlphaJS()");
#endif

  Napi::Env env = info.Env();
  if(info.Length() < 1 || !info[0].IsString()){
    Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string type = info[0].As<Napi::String>().Utf8Value();
  double result = this->getCriticalAlpha(type);
  return Napi::Number::New(env, result);
}

// GetSurfaceAreaJS() function
// --------------------
Napi::Value AlphaShape3D::GetSurfaceAreaJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called GetSurfaceAreaJS()");
#endif

  Napi::Env env = info.Env();
  double result = this->getSurfaceArea();
  return Napi::Number::New(env, result);
}

// GetVolumeJS() function
// --------------------
Napi::Value AlphaShape3D::GetVolumeJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called GetVolumeJS()");
#endif

  Napi::Env env = info.Env();
  double result = this->getVolume();
  return Napi::Number::New(env, result);
}

// GetBoundaryFacetsJS() function
// --------------------
Napi::Value AlphaShape3D::GetBoundaryFacetsJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called GetBoundaryFacetsJS()");
#endif

  Napi::Env env = info.Env();
  Matrix facets = this->getBoundaryFacets();
  Napi::Array result = Napi::Array::New(env, facets.numRows());
  for(size_t i = 0; i < facets.numRows(); i++){
    Napi::Array facet = Napi::Array::New(env, 3);
    for(size_t j = 0; j < 3; j++){
      facet.Set(j, Napi::Number::New(env, facets(i, j)));
    }
    result.Set(i, facet);
  }
  return result;
}

// WriteBoundaryFacetsJS() function
// --------------------
void AlphaShape3D::WriteBoundaryFacetsJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called WriteBoundaryFacetsJS()");
#endif

  Napi::Env env = info.Env();
  if(info.Length() < 1 || !info[0].IsString()){
    Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
  }
  std::string filename = info[0].As<Napi::String>().Utf8Value();
  this->writeBoundaryFacets(filename);
}

// CheckInShapeJS() function
// --------------------
Napi::Value AlphaShape3D::CheckInShapeJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called CheckInShapeJS()");
#endif

  Napi::Env env = info.Env();
  if(info.Length() < 1 || !info[0].IsArray()){
    Napi::TypeError::New(env, "Array expected").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Array jsArray = info[0].As<Napi::Array>();
  Matrix QP(jsArray.Length(), 3);
  for(size_t i = 0; i < jsArray.Length(); i++){
    Napi::Array point = jsArray.Get(i).As<Napi::Array>();
    for(size_t j = 0; j < 3; j++){
      QP(i, j) = point.Get(j).As<Napi::Number>().DoubleValue();
    }
  }
  Matrix result = this->checkInShape(QP);
  Napi::Array jsResult = Napi::Array::New(env, result.numRows());
  for(size_t i = 0; i < result.numRows(); i++){
    jsResult.Set(i, Napi::Boolean::New(env, result(i, 0) != 0));
  }
  return jsResult;
}

// WriteOffJS() function
// --------------------
void AlphaShape3D::WriteOffJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called WriteOffJS()");
#endif

  Napi::Env env = info.Env();
  if(info.Length() < 3 || !info[0].IsString() || !info[1].IsArray() || !info[2].IsArray()){
    Napi::TypeError::New(env, "Expected arguments: filename (string), points (array), facets (array)").ThrowAsJavaScriptException();
  }

  std::string filename = info[0].As<Napi::String>().Utf8Value();
  Napi::Array jsPoints = info[1].As<Napi::Array>();
  Napi::Array jsFacets = info[2].As<Napi::Array>();

  Matrix Points(jsPoints.Length(), 3);
  Matrix bf(jsFacets.Length(), 3);

  for(size_t i = 0; i < jsPoints.Length(); i++){
    Napi::Array point = jsPoints.Get(i).As<Napi::Array>();
    for(size_t j = 0; j < 3; j++){
      Points(i, j) = point.Get(j).As<Napi::Number>().DoubleValue();
    }
  }

  for(size_t i = 0; i < jsFacets.Length(); i++){
    Napi::Array facet = jsFacets.Get(i).As<Napi::Array>();
    for(size_t j = 0; j < 3; j++){
      bf(i, j) = facet.Get(j).As<Napi::Number>().DoubleValue();
    }
  }

  this->writeOff(filename, Points, bf);
}

// GetTriangulationJS() function
// --------------------
Napi::Value AlphaShape3D::GetTriangulationJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called GetTriangulationJS()");
#endif

  Napi::Env env = info.Env();
  Matrix triangulation = this->getTriangulation();
  Napi::Array result = Napi::Array::New(env, triangulation.numRows());
  for(size_t i = 0; i < triangulation.numRows(); i++){
    Napi::Array row = Napi::Array::New(env, 3);
    for(size_t j = 0; j < 3; j++){
      row.Set(j, Napi::Number::New(env, triangulation(i, j)));
    }
    result.Set(i, row);
  }
  return result;
}

// GetNearestNeighborJS() function
// --------------------
Napi::Value AlphaShape3D::GetNearestNeighborJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called GetNearestNeighborJS()");
#endif

  Napi::Env env = info.Env();
  if(info.Length() < 1 || !info[0].IsArray()){
    Napi::TypeError::New(env, "Array expected").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Array jsArray = info[0].As<Napi::Array>();
  Matrix QP(jsArray.Length(), 3);
  for(size_t i = 0; i < jsArray.Length(); i++){
    Napi::Array point = jsArray.Get(i).As<Napi::Array>();
    for(size_t j = 0; j < 3; j++){
      QP(i, j) = point.Get(j).As<Napi::Number>().DoubleValue();
    }
  }
  std::pair<Matrix, Matrix> result = this->getNearestNeighbor(QP);
  
  
  Napi::Object jsResult = Napi::Object::New(env);
  
  Napi::Array indices = Napi::Array::New(env, result.first.numRows());
  Napi::Array distances = Napi::Array::New(env, result.second.numRows());
  
  for(size_t i = 0; i < result.first.numRows(); i++){
    indices.Set(i, Napi::Number::New(env, result.first(i, 0)));
    distances.Set(i, Napi::Number::New(env, result.second(i, 0)));
  }
  
  jsResult.Set("indices", indices);
  jsResult.Set("distances", distances);
  return jsResult;
}

// GetSimplifiedShapeJS() function
// --------------------
Napi::Value AlphaShape3D::GetSimplifiedShapeJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called GetSimplifiedShapeJS()");
#endif

  Napi::Env env = info.Env();
  std::pair<Matrix, Matrix> result;
  
  if(info.Length() == 0){
    result = this->getSimplifiedShape();
  }
  else if(info.Length() == 1){
    if(info[0].IsNumber()){
      double stop_ratio = info[0].As<Napi::Number>().DoubleValue();
      result = this->getSimplifiedShape(stop_ratio);
    }
    else if(info[0].IsString()){
      std::string filename = info[0].As<Napi::String>().Utf8Value();
      result = this->getSimplifiedShape(filename);
    }
    else{
      Napi::TypeError::New(env, "Invalid argument type").ThrowAsJavaScriptException();
      return env.Null();
    }
  }
  else if(info.Length() == 2 && info[0].IsNumber() && info[1].IsString()){
    double stop_ratio = info[0].As<Napi::Number>().DoubleValue();
    std::string filename = info[1].As<Napi::String>().Utf8Value();
    result = this->getSimplifiedShape(stop_ratio, filename);
  }
  else{
    Napi::TypeError::New(env, "Invalid arguments").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  Napi::Object jsResult = Napi::Object::New(env);
  Napi::Array points = Napi::Array::New(env, result.first.numRows());
  Napi::Array facets = Napi::Array::New(env, result.second.numRows());
  
  for(size_t i = 0; i < result.first.numRows(); i++){
    Napi::Array point = Napi::Array::New(env, 3);
    for(size_t j = 0; j < 3; j++){
      point.Set(j, Napi::Number::New(env, result.first(i, j)));
    }
    points.Set(i, point);
  }
  
  for(size_t i = 0; i < result.second.numRows(); i++){
    Napi::Array facet = Napi::Array::New(env, 3);
    for(size_t j = 0; j < 3; j++){
      facet.Set(j, Napi::Number::New(env, result.second(i, j)));
    }
    facets.Set(i, facet);
  }
  
  jsResult.Set("points", points);
  jsResult.Set("facets", facets);
  return jsResult;
}

// RemoveUnusedPointsJS() function
// --------------------
Napi::Value AlphaShape3D::RemoveUnusedPointsJS(const Napi::CallbackInfo& info) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called RemoveUnusedPointsJS()");
#endif

  Napi::Env env = info.Env();
  if(info.Length() < 2 || !info[0].IsArray() || !info[1].IsArray()){
    Napi::TypeError::New(env, "Two arrays expected").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  Napi::Array jsPoints = info[0].As<Napi::Array>();
  Napi::Array jsFacets = info[1].As<Napi::Array>();
  
  Matrix Pi(jsPoints.Length(), 3);
  Matrix bfi(jsFacets.Length(), 3);
  
  for(size_t i = 0; i < jsPoints.Length(); i++){
    Napi::Array point = jsPoints.Get(i).As<Napi::Array>();
    for(size_t j = 0; j < 3; j++){
      Pi(i, j) = point.Get(j).As<Napi::Number>().DoubleValue();
    }
  }
  
  for(size_t i = 0; i < jsFacets.Length(); i++){
    Napi::Array facet = jsFacets.Get(i).As<Napi::Array>();
    for(size_t j = 0; j < 3; j++){
      bfi(i, j) = facet.Get(j).As<Napi::Number>().DoubleValue();
    }
  }
  
  std::pair<Matrix, Matrix> result = this->removeUnusedPoints(Pi, bfi);
  
  Napi::Object jsResult = Napi::Object::New(env);
  Napi::Array points = Napi::Array::New(env, result.first.numRows());
  Napi::Array facets = Napi::Array::New(env, result.second.numRows());
  
  for(size_t i = 0; i < result.first.numRows(); i++){
    Napi::Array point = Napi::Array::New(env, 3);
    for(size_t j = 0; j < 3; j++){
      point.Set(j, Napi::Number::New(env, result.first(i, j)));
    }
    points.Set(i, point);
  }
  
  for(size_t i = 0; i < result.second.numRows(); i++){
    Napi::Array facet = Napi::Array::New(env, 3);
    for(size_t j = 0; j < 3; j++){
      facet.Set(j, Napi::Number::New(env, result.second(i, j)));
    }
    facets.Set(i, facet);
  }
  
  jsResult.Set("points", points);
  jsResult.Set("facets", facets);
  return jsResult;
}  

// getAlpha() function
// --------------------
double AlphaShape3D::getAlpha(void) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called getAlpha()");
#endif

  return this->alphaShape->get_alpha();
}

// setAlpha() function
// --------------------
void AlphaShape3D::setAlpha(double alpha) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called setAlpha()");
#endif

  this->surface_mesh.clear();
  this->alphaShape->set_alpha(alpha);
  
#ifdef DEBUG_ALPHA_SHAPE_3D
  std::cout << "Number of solid components for alpha " << alpha
      << " is " << this->numRegions() << std::endl;
  std::list<As3::Cell_handle>     cells;
  std::list<As3::Facet>           facets;
  std::list<As3::Edge>            edges;
  std::list<As3::Vertex_handle>   vertices;
  this->alphaShape->get_alpha_shape_cells(std::back_inserter(cells),
      As3::INTERIOR);
  this->alphaShape->get_alpha_shape_facets(std::back_inserter(facets),
      As3::REGULAR);
  this->alphaShape->get_alpha_shape_facets(std::back_inserter(facets),
      As3::SINGULAR);
  this->alphaShape->get_alpha_shape_edges(std::back_inserter(edges),
      As3::SINGULAR);
  this->alphaShape->get_alpha_shape_vertices(std::back_inserter(vertices),
      As3::REGULAR);
  std::cout << "Number of interior tetrahedra is " 
            << cells.size() << std::endl;
  std::cout << "Number of boundary facets is " 
            << facets.size() << std::endl;
  std::cout << "Number of singular edges is " 
            << edges.size() << std::endl;
  std::cout << "Number of singular vertices is " 
            << vertices.size() << std::endl;
  std::cout << "Boundary surface construction." << std::endl;
#endif

  std::vector<As3::Facet> bfacets;
  this->alphaShape->get_alpha_shape_facets(std::back_inserter(bfacets), 
    As3::REGULAR);

  std::size_t nbf = bfacets.size();
  std::vector<CGAL_Polygon> polygons;
  CGAL_Polygon p;
  
  for(std::size_t i = 0; i < nbf; i++){
    if(this->alphaShape->classify(bfacets[i].first) != As3::EXTERIOR)
      bfacets[i] = this->alphaShape->mirror_facet(bfacets[i]);

    int32_t indices[3] = {
      (bfacets[i].second + 1) % 4,
      (bfacets[i].second + 2) % 4,
      (bfacets[i].second + 3) % 4,
    };

    // Consistent orientation
    if(bfacets[i].second % 2 == 0) std::swap(indices[0], indices[1]);

    p.clear();
    for(uint8_t j = 0; j < 3; j++){
      p.push_back(bfacets[i].first->vertex(indices[j])->info());
    }
    polygons.push_back(p);
  }

  PMP::polygon_soup_to_polygon_mesh(this->Points, 
    polygons, this->surface_mesh);
}

// numRegions() function
// --------------------
double AlphaShape3D::numRegions(void) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called numRegions()");
#endif

  return this->alphaShape->number_of_solid_components();
}

// getAlphaSpectrum() function
// --------------------
Matrix AlphaShape3D::getAlphaSpectrum() {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called getAlphaSpectrum()");
#endif

  Matrix a(1, this->numAlphaValues);
  for(uint32_t i = 0; i < this->numAlphaValues; i++){
    a(0, i) = this->alphaShape->get_nth_alpha(i + 1);
  }
  return a;
}

// getCriticalAlpha() function
// --------------------
double AlphaShape3D::getCriticalAlpha(std::string type) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called getCriticalAlpha()");
#endif

  if(type == "all-points"){
    return this->alphaShape->find_alpha_solid();
  }
  else if(type == "one-region"){
    return *this->alphaShape->find_optimal_alpha(1);
  }
  else{
    return nan("");
  }
}

// getSurfaceArea() function
// --------------------
double AlphaShape3D::getSurfaceArea(void) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called getSurfaceArea()");
#endif

  return PMP::area(this->surface_mesh);
}

// getVolume() function
// --------------------
double AlphaShape3D::getVolume(void) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called getVolume()");
#endif

  return PMP::volume(this->surface_mesh);
}

// getBoundaryFacets() function
// --------------------
Matrix AlphaShape3D::getBoundaryFacets(void) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called getBoundaryFacets()");
#endif

  Matrix bf(this->surface_mesh.number_of_faces(), 3);
  for(Mesh::Face_index face_index : this->surface_mesh.faces()){
    CGAL::Vertex_around_face_circulator<Mesh> 
      vcirc(this->surface_mesh.halfedge(face_index), this->surface_mesh);
    bf(face_index.idx(), 0) = *vcirc++;
    bf(face_index.idx(), 1) = *vcirc++;
    bf(face_index.idx(), 2) = *vcirc++;
  }
  return bf;
}

// getBoundaryFacets() function with filename
// --------------------
Matrix AlphaShape3D::getBoundaryFacets(std::string filename) {
  Matrix bf = this->getBoundaryFacets();
  this->writeOff(filename, this->inputPoints, bf);
  return bf;
}

// writeBoundaryFacets() function
// --------------------
void AlphaShape3D::writeBoundaryFacets(std::string filename) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called writeBoundaryFacets()");
#endif

  this->writeOff(filename, this->inputPoints, this->getBoundaryFacets());
}

// checkInShape() function
// --------------------
Matrix AlphaShape3D::checkInShape(Matrix QP) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called checkInShape()");
#endif

  Matrix tf(QP.numRows(), 1);
  for(uint32_t i = 0; i < QP.numRows(); i++){
    tf(i, 0) = this->alphaShape->classify(Point(QP(i, 0), QP(i, 1), QP(i, 2)));
  }
  return tf;
}

// getTriangulation() function
// --------------------
Matrix AlphaShape3D::getTriangulation(void) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called getTriangulation()");
#endif

  return this->triangulationMatrix;
}

// getNearestNeighbor() function
// --------------------
std::pair<Matrix, Matrix> AlphaShape3D::getNearestNeighbor(Matrix QP) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called getNearestNeighbor()");
#endif

  Matrix I(QP.numRows(), 1);
  Matrix D(QP.numRows(), 1);
  
  Mesh surface_mesh_s(this->surface_mesh);  
  PMP::remove_isolated_vertices(surface_mesh_s);
  
  std::vector<Point> points;
  std::vector<uint32_t> vs;
  for(Mesh::Vertex_index i : vertices(surface_mesh_s)){
    if(!surface_mesh_s.is_removed(i)){
      points.push_back(surface_mesh_s.point(i));
      vs.push_back(i);
    }
  }
    
  search_map map(points);
  Tree tree(boost::counting_iterator<std::size_t>(0),
    boost::counting_iterator<std::size_t>(
    vertices(surface_mesh_s).size()), 
    Tree::Splitter(), Traits(map));
  K_neighbor_search::Distance tr_dist(map);
  
  for(uint32_t i = 0; i < QP.numRows(); i++){
    K_neighbor_search search(tree, Point(QP(i, 0), QP(i, 1), QP(i, 2)), 
      1, 0, true, tr_dist);
    I(i, 0) = vs[search.begin()->first];
    D(i, 0) = 
      tr_dist.inverse_of_transformed_distance(search.begin()->second);
  }
  return std::make_pair(I, D);
}

// getSimplifiedShape() function with stop_ratio
// --------------------
std::pair<Matrix, Matrix> 
    AlphaShape3D::getSimplifiedShape(double stop_ratio) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called getSimplifiedShape()");
#endif

  Mesh surface_mesh_s(this->surface_mesh);
  SMS::Edge_count_ratio_stop_predicate<Mesh> stop(stop_ratio);
  uint32_t r = SMS::edge_collapse(surface_mesh_s, stop);
  PMP::remove_isolated_vertices(surface_mesh_s);
  surface_mesh_s.collect_garbage();
  
#ifdef DEBUG_ALPHA_SHAPE_3D
  std::cout << "Number of edges removed is " << r << std::endl
            << "Number of  final edges is " 
            << surface_mesh_s.number_of_edges() << std::endl;
#endif
  
  Matrix Points(surface_mesh_s.number_of_vertices(), 3);
  Matrix bf(surface_mesh_s.number_of_faces(), 3);

  for(Mesh::Vertex_index vertex_index : surface_mesh_s.vertices()){
    Point p = surface_mesh_s.point(vertex_index);
    Points(vertex_index.idx(), 0) = p[0]; 
    Points(vertex_index.idx(), 1) = p[1]; 
    Points(vertex_index.idx(), 2) = p[2];
  }
  
  for(Mesh::Face_index face_index : surface_mesh_s.faces()){
    CGAL::Vertex_around_face_circulator<Mesh> 
      vcirc(surface_mesh_s.halfedge(face_index), this->surface_mesh);
    bf(face_index.idx(), 0) = *vcirc++;
    bf(face_index.idx(), 1) = *vcirc++;
    bf(face_index.idx(), 2) = *vcirc++;
  } 
  return std::make_pair(Points, bf);
}

// getSimplifiedShape() function without parameters
// --------------------
std::pair<Matrix, Matrix> 
    AlphaShape3D::getSimplifiedShape() {
  double stop_ratio = 0.05;
  return this->getSimplifiedShape(stop_ratio);
}

// getSimplifiedShape() function with filename
// --------------------
std::pair<Matrix, Matrix> 
    AlphaShape3D::getSimplifiedShape(std::string filename) {
  double stop_ratio = 0.05;
  std::pair<Matrix, Matrix> ret = this->getSimplifiedShape(stop_ratio);
  this->writeOff(filename, ret.first, ret.second);
  return ret;
}

// getSimplifiedShape() function with stop_ratio and filename
// --------------------
std::pair<Matrix, Matrix> 
    AlphaShape3D::getSimplifiedShape(double stop_ratio, 
    std::string filename) {
  std::pair<Matrix, Matrix> ret = this->getSimplifiedShape(stop_ratio);
  this->writeOff(filename, ret.first, ret.second);
  return ret;
}

// removeUnusedPoints() function
// --------------------
std::pair<Matrix, Matrix> 
    AlphaShape3D::removeUnusedPoints(Matrix Pi, Matrix bfi) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called removeUnusedPoints()");
#endif

  Mesh surface_mesh_s;
  std::vector<CGAL_Polygon> polygons;
  CGAL_Polygon p;
  std::vector<Point> points;
  
#ifdef DEBUG_ALPHA_SHAPE_3D
  std::cout << "Boundary surface reconstruction. " << std::endl;
#endif
  
  uint32_t n = Pi.numRows();
  uint32_t nbf = bfi.numRows();
  
  for(std::size_t i = 0; i < n; i++){
    points.push_back(Point(Pi(i, 0), Pi(i, 1), Pi(i, 2)));
  }
  
  for(std::size_t i = 0; i < nbf; i++){
    p.clear();
    for(uint8_t j = 0; j < 3; j++){
      p.push_back(bfi(i, j));
    }
    polygons.push_back(p);
  }
  
  PMP::orient_polygon_soup(points, polygons);
  PMP::repair_polygon_soup(points, polygons);
  PMP::polygon_soup_to_polygon_mesh(points, 
    polygons, surface_mesh_s);
  surface_mesh_s.collect_garbage();
  
  Matrix Points(surface_mesh_s.number_of_vertices(), 3);
  Matrix bf(surface_mesh_s.number_of_faces(), 3);

  for(Mesh::Vertex_index vertex_index : surface_mesh_s.vertices()){
    Point p = surface_mesh_s.point(vertex_index);
    Points(vertex_index.idx(), 0) = p[0]; 
    Points(vertex_index.idx(), 1) = p[1]; 
    Points(vertex_index.idx(), 2) = p[2];
  }
  
  for(Mesh::Face_index face_index : surface_mesh_s.faces()){
    CGAL::Vertex_around_face_circulator<Mesh> 
      vcirc(surface_mesh_s.halfedge(face_index), this->surface_mesh);
    bf(face_index.idx(), 0) = *vcirc++;
    bf(face_index.idx(), 1) = *vcirc++;
    bf(face_index.idx(), 2) = *vcirc++;
  } 
  return std::make_pair(Points, bf);
}

// writeOff() function
// --------------------
void AlphaShape3D::writeOff(std::string filename, Matrix Points, Matrix bf) {
#ifdef DEBUG_ALPHA_SHAPE_3D
  consoleLog(0, "Called writeOff()");
#endif

  uint32_t n = Points.numRows();
  uint32_t nbf = bf.numRows();
  
  std::stringstream pts;
  std::stringstream ind;

  for(std::size_t i = 0; i < n; i++){
    pts << Points(i, 0) << " " << Points(i, 1) << " " << Points(i, 2) << std::endl;
  }
  
  for(std::size_t i = 0; i < nbf; i++){
    ind << "3 " << (uint64_t)bf(i, 0) << " " << (uint64_t)bf(i, 1) 
      << " " << (uint64_t)bf(i, 2) << std::endl;
  }
    
  std::ofstream of(filename);
  CGAL::set_ascii_mode(of);
  of << "OFF" << std::endl << n << " " << nbf << " 0" << std::endl;
  of << pts.str();
  of << ind.str();
  of.close();
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  return AlphaShape3D::Init(env, exports);
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)

}  // namespace alpha_shape_3d_ns
