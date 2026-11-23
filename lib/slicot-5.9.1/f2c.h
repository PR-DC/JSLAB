/* Types, intrinsics, and symbols needed by the translated SLICOT routines. */
#ifndef JSLAB_SLICOT_F2C_H
#define JSLAB_SLICOT_F2C_H

typedef int integer;
typedef int logical;
typedef int ftnlen;
typedef double doublereal;

#define min(a,b) ((a) < (b) ? (a) : (b))
#define max(a,b) ((a) > (b) ? (a) : (b))
#define dgemm_ jslab_slicot_dgemm
#define dlacpy_ jslab_slicot_dlacpy
#define dlaset_ jslab_slicot_dlaset
#define xerbla_ jslab_slicot_xerbla
#define lsame_ jslab_slicot_lsame
#define dcopy_ jslab_slicot_dcopy
#define daxpy_ jslab_slicot_daxpy
#define dlascl_ jslab_slicot_dlascl
#define dgemv_ jslab_slicot_dgemv
#define dgetrf_ jslab_slicot_dgetrf
#define dgetrs_ jslab_slicot_dgetrs
#endif
