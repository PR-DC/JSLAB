% Example for vector and matrix math
% Author: Milos Petrasinovic <mpetrasinovic@pr-dc.com>
% PR-DC, Republic of Serbia
% info@pr-dc.com
% Version 0.0.1
clear, close all, clc, tic

% --- 3D Vectors ---
disp(' --- 3D Vectors ---');

% Define 3D vectors
v1 = [1; 2; 3];
v2 = [4; 8; 6];
v3 = [7; 5; 9]; % Additional vector for triple products

% Display vectors
disp('Vector v1:');
disp(v1);

disp('Vector v2:');
disp(v2);

disp('Vector v3:');
disp(v3);

% Vector addition
v_add = v1 + v2;
disp('Vector Addition v1 + v2:');
disp(v_add);

% Vector plus (similar to addition)
v_plus = v1 + v2;
disp('Vector Plus v1 + v2:');
disp(v_plus);

% Vector subtraction
v_sub = v1 - v2;
disp('Vector Subtraction v1 - v2:');
disp(v_sub);

% Vector minus (similar to subtraction)
v_minus = v1 - v2;
disp('Vector Minus v1 - v2:');
disp(v_minus);

% Scalar multiplication
scalar = 2;
v_scalar_mult = scalar * v1;
disp(['Scalar Multiplication ' num2str(scalar) ' * v1:']);
disp(v_scalar_mult);

% Dot product
v_dot = dot(v1, v2);
disp('Dot Product of v1 and v2:');
disp(v_dot);

% Cross product
v_cross = cross(v1, v2);
disp('Cross Product of v1 and v2:');
disp(v_cross);

% Magnitude (norm) of v1
v1_norm = norm(v1);
disp('Magnitude (Norm) of v1:');
disp(v1_norm);

% Normalization of v1
v1_normalized = v1 / norm(v1);
disp('Normalization of v1:');
disp(v1_normalized);

% Azimuth and Elevation of v1 (in degrees)
azimuth = atan2(v1(2), v1(1)) * (180/pi);
elevation = atan2(v1(3), sqrt(v1(1)^2 + v1(2)^2)) * (180/pi);
v1_angles = [azimuth; elevation];
disp('Azimuth and Elevation of v1 (degrees):');
disp(v1_angles);

% Angle between v1 and v2 (in degrees)
theta = acos(dot(v1, v2) / (norm(v1) * norm(v2))) * (180/pi);
disp('Angle between v1 and v2 (in degrees):');
disp(theta);

% Projection of v1 onto v2
proj_v1_on_v2 = (dot(v1, v2) / dot(v2, v2)) * v2;
disp('Projection of v1 onto v2:');
disp(proj_v1_on_v2);

% Vector triple product [v1 • (v2 × v3)]
v_triple_product = dot(v1, cross(v2, v3));
disp('Vector Triple Product v1 • (v2 × v3):');
disp(v_triple_product);

% Area of parallelogram formed by v1 and v2
area_parallelogram = norm(cross(v1, v2));
disp('Area of Parallelogram formed by v1 and v2:');
disp(area_parallelogram);

% Volume of parallelepiped formed by v1, v2, and v3
volume_parallelepiped = abs(dot(v1, cross(v2, v3)));
disp('Volume of Parallelepiped formed by v1, v2, and v3:');
disp(volume_parallelepiped);

% --- 2D Matrices ---
disp(' --- 2D Matrices ---');

% Define 2D matrices
A = [1, 2; 3, 4];
B = [5, 7; 6, 8];
C = [3, 1; 4, 1; 5, 9];

% Display matrices
disp('Matrix A:');
disp(A);

disp('Matrix B:');
disp(B);

disp('Matrix C:');
disp(C);

% Display various matrix constructions
disp('Matrix filled with 11 (2x3):');
disp(ones(2, 3) * 11);

disp('Matrix of NaNs (2x4):');
disp(NaN(2, 4));

disp('Matrix of ones (3x2):');
disp(ones(3, 2));

disp('Matrix of zeros (3x4):');
disp(zeros(3, 4));

disp('Diagonal Matrix with [1, 2, 3, 4]:');
disp(diag([1, 2, 3, 4]));

disp('Identity Matrix of size 4:');
disp(eye(4));

% Basic matrix operations
disp('First row of A:');
disp(A(1, :));

disp('Second column of A:');
disp(A(:, 2));

disp('Number of rows in A:');
disp(size(A, 1));

disp('Number of columns in A:');
disp(size(A, 2));

disp('Size of A:');
disp(size(A));

disp('Number of elements in A:');
disp(numel(A));

% Concatenation
disp('Concatenation of A and B column-wise:');
disp([A, B]);

disp('Concatenation of A and B row-wise:');
disp([A; B]);

% Reshaping
disp('Reshape B to 1x4:');
disp(reshape(B, 1, 4));

disp('Reshape B to 4x1:');
disp(reshape(B, 4, 1));

% Repeating matrices
disp('Repeat B 1 time along rows and 2 times along columns:');
disp(repmat(B, 1, 2));

disp('Repeat B 2 times along rows and 1 time along columns:');
disp(repmat(B, 2, 1));

disp('Repeat B 2 times along both rows and columns:');
disp(repmat(B, 2, 2));

% Transpose of B
disp('Transpose of B:');
disp(B');

% Transpose of A
A_transpose = A';
disp('Transpose of A:');
disp(A_transpose);

% Inverse of A (if invertible)
A_inv = inv(A);
disp('Inverse of A:');
disp(A_inv);

% Determinant of A
A_det = det(A);
disp('Determinant of A:');
disp(A_det);

% Trace of A
A_trace = trace(A);
disp('Trace of A:');
disp(A_trace);

% Norm of A
A_norm = norm(A);
disp('Norm of A:');
disp(A_norm);

% Matrix power (A squared)
A_squared = A^2;
disp('A squared (A^2):');
disp(A_squared);

% Matrix exponential of A
A_expm = expm(A);
disp('Matrix Exponential of A:');
disp(A_expm);

% Matrix addition
A_add = A + B;
disp('Matrix Addition A + B:');
disp(A_add);

% Matrix plus (similar to addition)
A_plus = A + B;
disp('Matrix Plus A + B:');
disp(A_plus);

% Matrix subtraction
A_sub = A - B;
disp('Matrix Subtraction A - B:');
disp(A_sub);

% Matrix minus (similar to subtraction)
A_minus = A - B;
disp('Matrix Minus A - B:');
disp(A_minus);

% Matrix multiplication
A_mul = A * B;
disp('Matrix Multiplication A * B:');
disp(A_mul);

% Solving linear system A * x = b
b = [5; 11];
x = A \ b;
disp('Solution to linear system A * x = b:');
disp('b vector:');
disp(b);
disp('Solution x:');
disp(x);

% Scalar division
A_scalar_div = A / scalar;
disp(['Scalar Division A / ' num2str(scalar) ':']);
disp(A_scalar_div);

% Element-wise division
A_B_div = A ./ B;
disp('Element-wise Division A ./ B:');
disp(A_B_div);

% Scalar multiplication (element-wise)
A_scalar_mult = scalar * A;
disp(['Scalar Multiplication ' num2str(scalar) ' * A:']);
disp(A_scalar_mult);

% Element-wise multiplication
A_B_mult = A .* B;
disp('Element-wise Multiplication A .* B:');
disp(A_B_mult);

% Scalar power (element-wise)
A_scalar_pow = A .^ scalar;
disp(['Scalar Power A .^ ' num2str(scalar) ':']);
disp(A_scalar_pow);

% Reciprocal of A (element-wise)
A_reciprocal = 1 ./ A;
disp('Reciprocal of A:');
disp(A_reciprocal);

% Sum of elements in C
C_sum = sum(C);
disp('Sum of elements in C:');
disp(C_sum);

% Sort elements in C
C_sort = sort(C);
disp('Sorted elements in C:');
disp(C_sort);

% Minimum element in C
C_min = min(C);
disp('Minimum element in C:');
disp(C_min);

% Maximum element in C
C_max = max(C);
disp('Maximum element in C:');
disp(C_max);

% Get Submatrix by rows and columns
disp('Get Submatrix of A (rows 1-2, columns 2):');
sub_A_rows_cols = A(1:2, 2);
disp(sub_A_rows_cols);

% Get Submatrix of A (all rows, columns 2):
disp('Get Submatrix of A (all rows, columns 2):');
sub_A_all_rows_cols = A(:, 2);
disp(sub_A_all_rows_cols);

% Get Submatrix of A (rows 2, all columns):
disp('Get Submatrix of A (rows 2, all columns):');
sub_A_rows_all_cols = A(2, :);
disp(sub_A_rows_all_cols);

% Get Submatrix of A by indices [1, 4]:
disp('Get Submatrix of A by indices [1, 4]:');
sub_A_indices = A([1, 4]);
disp(sub_A_indices);

% Set Submatrix of A (rows 1, columns 2) to 10:
disp('Set Submatrix of A (rows 1, columns 2) to 10:');
A(1, 2) = 10;
disp(A);

% Set Submatrix of A by indices 4 to 20:
disp('Set Submatrix of A by indices 4 to 20:');
A(4) = 20;
disp(A);

% Set Submatrix of A to B:
disp('Set A to B:');
A(:, :) = B;
disp(A);

% Set Submatrix of A to [1, 2, 3, 4]:
disp('Set A to [1, 2, 3, 4]:');
A(:) = [1, 2, 3, 4];
disp(A);

% --- End of Calculations ---
disp(' Program je uspesno izvrsen... ');
disp([' Potrebno vreme: ' num2str(toc(), 2) ' sekundi']);
disp(' -------------------- ');
