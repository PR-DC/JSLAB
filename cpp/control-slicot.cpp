// JSLAB - control-slicot.cpp
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// --------------------

#include "control-core.h"
#include <algorithm>
#include <cctype>
#include <vector>

using ColMatrix = Eigen::MatrixXd;
using RowMatrix = Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;
using ConstBlock = Eigen::Map<const ColMatrix, 0, Eigen::OuterStride<>>;
using Block = Eigen::Map<ColMatrix, 0, Eigen::OuterStride<>>;

extern "C" {
int ab05md_(char *uplo, char *over, int *n1, int *m1,
     int *p1, int *n2, int *p2, double *a1, int *lda1,
     double *b1, int *ldb1, double *c1, int *ldc1,
    double *d1, int *ldd1, double *a2, int *lda2,
    double *b2, int *ldb2, double *c2, int *ldc2,
    double *d2, int *ldd2, int *n, double *a, int *
    lda, double *b, int *ldb, double *c__, int *ldc,
    double *d__, int *ldd, double *dwork, int *ldwork,
    int *info, int uplo_len, int over_len);
int ab05nd_(char *over, int *n1, int *m1, int *
    p1, int *n2, double *alpha, double *a1, int *lda1,
    double *b1, int *ldb1, double *c1, int *ldc1,
    double *d1, int *ldd1, double *a2, int *lda2,
    double *b2, int *ldb2, double *c2, int *ldc2,
    double *d2, int *ldd2, int *n, double *a, int *
    lda, double *b, int *ldb, double *c__, int *ldc,
    double *d__, int *ldd, int *iwork, double *dwork,
    int *ldwork, int *info, int over_len);
int ab05pd_(char *over, int *n1, int *m, int *p,
    int *n2, double *alpha, double *a1, int *lda1,
    double *b1, int *ldb1, double *c1, int *ldc1,
    double *d1, int *ldd1, double *a2, int *lda2,
    double *b2, int *ldb2, double *c2, int *ldc2,
    double *d2, int *ldd2, int *n, double *a, int *
    lda, double *b, int *ldb, double *c__, int *ldc,
    double *d__, int *ldd, int *info, int over_len);

int jslab_slicot_lsame(const char* a, const char* b, int, int) {
  return std::toupper(static_cast<unsigned char>(*a)) ==
    std::toupper(static_cast<unsigned char>(*b));
}

int jslab_slicot_xerbla(const char*, const int*, int) {
  // AB05MD reports the argument error through INFO.
  return 0;
}

int jslab_slicot_dgemm(const char*, const char*, const int* m, const int* n,
    const int* k, const double* alpha, const double* a, const int* lda,
    const double* b, const int* ldb, const double* beta, double* c, const int* ldc,
    int, int) {
  // AB05MD uses only non-transposed products.
  Block output(c, *m, *n, Eigen::OuterStride<>(*ldc));
  if(*beta == 0) {
    output.setZero();
  } else {
    output *= *beta;
  }
  output.noalias() += *alpha * (ConstBlock(a, *m, *k, Eigen::OuterStride<>(*lda)) *
    ConstBlock(b, *k, *n, Eigen::OuterStride<>(*ldb)));
  return 0;
}

int jslab_slicot_dlacpy(const char*, const int* rows, const int* columns,
    const double* a, const int* lda, double* b, const int* ldb, int) {
  Block output(b, *rows, *columns, Eigen::OuterStride<>(*ldb));
  output = ConstBlock(a, *rows, *columns, Eigen::OuterStride<>(*lda));
  return 0;
}

int jslab_slicot_dlaset(const char*, const int* rows, const int* columns,
    const double* off_diagonal, const double* diagonal, double* a, const int* lda, int) {
  Block output(a, *rows, *columns, Eigen::OuterStride<>(*lda));
  output.setConstant(*off_diagonal);
  output.diagonal().setConstant(*diagonal);
  return 0;
}

int jslab_slicot_dcopy(const int* n, const double* x, const int* incx,
    double* y, const int* incy) {
  for(int i = 0; i < *n; ++i) {
    y[i * *incy] = x[i * *incx];
  }
  return 0;
}

int jslab_slicot_daxpy(const int* n, const double* alpha, const double* x,
    const int* incx, double* y, const int* incy) {
  for(int i = 0; i < *n; ++i) {
    y[i * *incy] += *alpha * x[i * *incx];
  }
  return 0;
}

int jslab_slicot_dlascl(const char*, const int*, const int*, const double* from,
    const double* to, const int* m, const int* n, double* a, const int* lda,
    int* info, int) {
  // AB05PD scales a full matrix from 1 to the requested weight.
  Block matrix(a, *m, *n, Eigen::OuterStride<>(*lda));
  matrix *= *to / *from;
  *info = 0;
  return 0;
}

int jslab_slicot_dgemv(const char* transpose, const int* m, const int* n,
    const double* alpha, const double* a, const int* lda, const double* x,
    const int* incx, const double* beta, double* y, const int* incy, int) {
  const ConstBlock matrix(a, *m, *n, Eigen::OuterStride<>(*lda));
  const bool normal = *transpose == 'N';
  using Stride = Eigen::InnerStride<Eigen::Dynamic>;
  Eigen::Map<const Eigen::VectorXd, 0, Stride> input(x, normal ? *n : *m, Stride(*incx));
  Eigen::Map<Eigen::VectorXd, 0, Stride> output(y, normal ? *m : *n, Stride(*incy));
  if(*beta == 0) {
    output.setZero();
  } else {
    output *= *beta;
  }
  if(normal) {
    output.noalias() += *alpha * (matrix * input);
  } else {
    output.noalias() += *alpha * (matrix.transpose() * input);
  }
  return 0;
}

int jslab_slicot_dgetrf(const int* m, const int* n, double* a, const int* lda,
    int* pivots, int* info) {
  Block matrix(a, *m, *n, Eigen::OuterStride<>(*lda));
  *info = 0;
  for(int col = 0; col < std::min(*m, *n); ++col) {
    const int count = *m - col - 1;
    Eigen::Index relative_pivot;
    matrix.col(col).segment(col, count + 1).cwiseAbs().maxCoeff(&relative_pivot);
    const int pivot = col + static_cast<int>(relative_pivot);
    pivots[col] = pivot + 1;
    if(matrix(pivot, col) == 0) {
      if(!*info) {
        *info = col + 1;
      }
      continue;
    }
    if(pivot != col) {
      matrix.row(col).swap(matrix.row(pivot));
    }
    auto lower = matrix.col(col).tail(count);
    lower /= matrix(col, col);
    const int right = *n - col - 1;
    matrix.bottomRightCorner(count, right).noalias() -= lower * matrix.row(col).tail(right);
  }
  return 0;
}

int jslab_slicot_dgetrs(const char*, const int* n, const int* nrhs, const double* a,
    const int* lda, const int* pivots, double* b, const int* ldb, int* info, int) {
  // AB05ND only solves non-transposed systems.
  const ConstBlock lu(a, *n, *n, Eigen::OuterStride<>(*lda));
  Block rhs(b, *n, *nrhs, Eigen::OuterStride<>(*ldb));
  for(int row = 0; row < *n; ++row) {
    const int pivot = pivots[row] - 1;
    if(pivot != row) {
      rhs.row(row).swap(rhs.row(pivot));
    }
  }
  lu.triangularView<Eigen::UnitLower>().solveInPlace(rhs);
  lu.triangularView<Eigen::Upper>().solveInPlace(rhs);
  *info = 0;
  return 0;
}
}

namespace {
// f2c shifts pointers to emulate one-based indexing. Reserve padding so
// those intermediate pointers remain in the same allocation.
struct SlicotMatrix {
  int rows;
  int columns;
  int leading;
  std::vector<double> storage;

  SlicotMatrix(int rows, int columns, const double* values = nullptr)
    : rows(rows), columns(columns), leading(std::max(1, rows)),
      storage(leading + 1 + leading * std::max(1, columns)) {
    if(values && rows && columns) {
      Block matrix(data(), rows, columns, Eigen::OuterStride<>(leading));
      matrix = Eigen::Map<const RowMatrix>(values, rows, columns);
    }
  }

  double* data() { return storage.data() + leading + 1; }

  bool write(double* output) {
    if(rows && columns) {
      ConstBlock matrix(data(), rows, columns, Eigen::OuterStride<>(leading));
      Eigen::Map<RowMatrix> result(output, rows, columns);
      result = matrix;
      return result.allFinite();
    }
    return true;
  }
};
}

bool control_core::Interconnections::connect(const double* first, const double* second,
    int n1, int n2, int m, int intermediate, int p, int mode, double factor, double* output) {
  const int n = n1 + n2;
  const int inputs2 = mode == 1 ? m : intermediate;
  const int outputs2 = mode == 2 ? m : p;
  SlicotMatrix a1(n1, n1, first), b1(n1, m, first + n1 * n1);
  SlicotMatrix c1(intermediate, n1, first + n1 * (n1 + m));
  SlicotMatrix d1(intermediate, m, first + n1 * (n1 + m + intermediate));
  SlicotMatrix a2(n2, n2, second), b2(n2, inputs2, second + n2 * n2);
  SlicotMatrix c2(outputs2, n2, second + n2 * (n2 + inputs2));
  SlicotMatrix d2(outputs2, inputs2, second + n2 * (n2 + inputs2 + outputs2));
  SlicotMatrix a(n, n), b(n, m), c(p, n), d(p, m);
  char lower = 'L';
  char no_overlap = 'N';
  int returned = 0;
  int info = 0;
  int work_size = 1;
  double work[2] = {};
  if(mode == 0) {
    ab05md_(&lower, &no_overlap, &n1, &m, &intermediate, &n2, &p,
    a1.data(), &a1.leading, b1.data(), &b1.leading, c1.data(), &c1.leading,
    d1.data(), &d1.leading, a2.data(), &a2.leading, b2.data(), &b2.leading,
    c2.data(), &c2.leading, d2.data(), &d2.leading, &returned, a.data(), &a.leading,
    b.data(), &b.leading, c.data(), &c.leading, d.data(), &d.leading,
    work + 1, &work_size, &info, 1, 1);
  } else if(mode == 1) {
    ab05pd_(&no_overlap, &n1, &m, &p, &n2, &factor,
      a1.data(), &a1.leading, b1.data(), &b1.leading, c1.data(), &c1.leading,
      d1.data(), &d1.leading, a2.data(), &a2.leading, b2.data(), &b2.leading,
      c2.data(), &c2.leading, d2.data(), &d2.leading, &returned, a.data(), &a.leading,
      b.data(), &b.leading, c.data(), &c.leading, d.data(), &d.leading, &info, 1);
  } else {
    // AB05ND expresses the external input as U1 + alpha*Y2.
    double alpha = -factor;
    work_size = std::max({1, p * p, m * m + m, n1 * p});
    std::vector<double> workspace(work_size + 1);
    std::vector<int> pivots(p + 1);
    ab05nd_(&no_overlap, &n1, &m, &p, &n2, &alpha,
      a1.data(), &a1.leading, b1.data(), &b1.leading, c1.data(), &c1.leading,
      d1.data(), &d1.leading, a2.data(), &a2.leading, b2.data(), &b2.leading,
      c2.data(), &c2.leading, d2.data(), &d2.leading, &returned, a.data(), &a.leading,
      b.data(), &b.leading, c.data(), &c.leading, d.data(), &d.leading, pivots.data() + 1,
      workspace.data() + 1, &work_size, &info, 1);
  }
  return info == 0 && returned == n && a.write(output) && b.write(output + n * n) &&
    c.write(output + n * (n + m)) && d.write(output + n * (n + m + p));
}
