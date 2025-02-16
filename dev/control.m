clc, clear all, close all
format long
pkg load control
pkg load signal

function [y, t_out] = lsim_custom(num, den, u, t_in)
  % lsim_custom - Custom implementation of lsim for discrete-time systems
  %
  % Syntax:
  %   [y, t_out] = lsim_custom(num, a, u, t_in)
  %
  % Inputs:
  %   num     - Numerator coefficients of the transfer function (vector)
  %   den     - Denominator coefficients of the transfer function (vector)
  %   u     - Input signal (vector)
  %   t_in  - Time vector (vector)
  %
  % Outputs:
  %   y     - Output signal (vector)
  %   t_out - Time vector (same as input)

  % Number of samples
  N = length(u);

  % Initialize output vector with zeros
  y = zeros(N, 1);

  % Ensure denominator den[1] is 1
  if den(1) ~= 1
    num = num / a(1);
    den = den / den(1);
  end

  % Compute the output using the difference equation
  for n = 1:N
    % Feedforward (num) terms: sum num(k) * u[n - k + 1]
    for k = 1:length(num)
      idx = n - k + 1;
      if idx >= 1
        y(n) += num(k) * u(idx);
      end
    end

    % Feedback (den) terms: sum den(k) * y[n - k + 1] for k >= 2
    for k = 2:length(den)
      idx = n - k + 1;
      if idx >= 1
        y(n) -= den(k) * y(idx);
      end
    end
  end

  if(length(num) < length(den))
    n = length(den) - length(num)
    y = [zeros(n, 1); y(1:end-n)];
  end

  % Output time vector remains unchanged
  t_out = t_in;
end

function sys = tf_custom(num, den, Ts)
    % tf_custom Creates a transfer function structure
    %
    % Syntax:
    %   sys = tf_custom(num, den, Ts)
    %
    % Inputs:
    %   num - Numerator coefficients
    %   den - Denominator coefficients
    %   Ts  - Sampling time (optional, default is 0 for continuous-time)
    %
    % Output:
    %   sys - Transfer function structure with fields num, den, Ts

    if nargin < 3
        Ts = 0; % Continuous-time by default
    end

    sys.num = num;
    sys.den = den;
    sys.Ts = Ts;
end

function sys = ss_custom(A, B, C, D, Ts)
    % ss_custom Creates a state-space structure
    %
    % Syntax:
    %   sys = ss_custom(A, B, C, D, Ts)
    %
    % Inputs:
    %   A  - State matrix
    %   B  - Input matrix
    %   C  - Output matrix
    %   D  - Feedthrough matrix
    %   Ts - Sampling time (optional, default is 0 for continuous-time)
    %
    % Output:
    %   sys - State-space structure with fields A, B, C, D, Ts

    if nargin < 5
        Ts = 0; % Continuous-time by default
    end

    sys.A = A;
    sys.B = B;
    sys.C = C;
    sys.D = D;
    sys.Ts = Ts;
end

function sys = tf2ss_custom(num, den)
  n = length(den);
  num = [zeros(1, length(den) - length(num)), num];

  A = eye(n-1);
  A(1, :) = [];
  A(n-1, :) = -fliplr(den(2:(n)));

  C = num-den.*num(1);
  C = fliplr(C(2:(n)));

  B = zeros(n-1, 1);
  B(end) = 1;

  D = num(1);

  sys = ss_custom(A, B, C, D);
end

function [num, den] = ss2tf_custom(sys)
    A = sys.A;
    B = sys.B;
    C = sys.C;
    D = sys.D;
    Ts = sys.Ts;

    % Calculate the denominator
    den = poly(A);

    % Calculate the numerator
    num = poly(A - B * C) + (D-1)*den;

    % Normalize numerator length
    num = [zeros(1, length(den) - length(num)), num];
end

function sysd = c2d_zoh_custom(sysc, Ts)
    % c2d_zoh_custom Discretizes a continuous-time state-space system using Zero-Order Hold (ZOH)
    %
    % Syntax:
    %   sysd = c2d_zoh_custom(sysc, Ts)
    %
    % Inputs:
    %   sysc - Continuous-time state-space structure with fields A, B, C, D
    %   Ts   - Sampling time
    %
    % Output:
    %   sysd - Discrete-time state-space structure with fields A, B, C, D, Ts

    A = sysc.A;
    B = sysc.B;
    C = sysc.C;
    D = sysc.D;

    n = size(A,1);
    m = size(B,2);

    % Construct the augmented matrix
    M = [A, B; zeros(m, n + m)];

    % Compute the matrix exponential
    M_exp = expm(M * Ts);

    Ad = M_exp(1:n, 1:n);
    Bd = M_exp(1:n, n+1:end);

    % Update D to account for the sampling interval
    Dd = D;

    % Create the discrete-time system
    sysd = ss_custom(Ad, Bd, C, Dd, Ts);
end

function [numd, denda] = c2d_custom(numc, denc, Ts)
    % c2d_custom Discretizes a continuous-time transfer function using ZOH
    %
    % Syntax:
    %   [numd, denda] = c2d_custom(numc, denc, Ts)
    %
    % Inputs:
    %   numc - Numerator coefficients of the continuous-time transfer function
    %   denc - Denominator coefficients of the continuous-time transfer function
    %   Ts   - Sampling time
    %
    % Outputs:
    %   numd  - Numerator coefficients of the discrete-time transfer function
    %   denda - Denominator coefficients of the discrete-time transfer function

    % Convert transfer function to state-space using custom tf2ss
    sysc = tf2ss_custom(numc, denc);

    % Discretize the state-space system using custom ZOH
    sysd = c2d_zoh_custom(sysc, Ts);

    % Convert discrete state-space to transfer function using custom ss2tf
    [numd, denda] = ss2tf_custom(sysd);
end

% System transfer function
num = [3.953, 1];        % Numerator
den = [1, 2, 3.868];  % Denominator

% Time vector and input signal
t = 0:49;       % 50 time steps
u = ones(size(t)); % Unit step input

% Response using built-in lsim
sys = tf(num, den, 1); % Transfer function with sampling time of 1
[y_builtin, t_builtin, x] = lsim(sys, u, t);

% Response using custom lsim
[y_custom, t_custom] = lsim_custom(num, den, u, t);

[y_builtin, y_custom]

num = [1.095, 23.03];        % Numerator
den = [1, 16.52, 155.1, 2];  % Denominator
sys1 = tf(num, den); % Transfer function
c2d(sys1, 1)
[numd, dend] = c2d_custom(num, den, 1)

num = [1.095, 23.03, 3];        % Numerator
den = [1, 16.52, 155.1, 2];  % Denominator
sys1 = tf(num, den); % Transfer function
c2d(sys1, 1)
[numd, dend] = c2d_custom(num, den, 1)

num = [1.095, 23.03, 1, 1];        % Numerator
den = [1, 16.52, 155.1, 2];  % Denominator
sys1 = tf(num, den); % Transfer function
c2d(sys1, 1)
[numd, dend] = c2d_custom(num, den, 1)

A = [-7 1 0; -14 0 1; -8 0 0];
B = [20; 125; 185];
C = [1 0 0 ];
D = 5;

sys = ss(A, B, C, D);
disp('SYS1');
[num, den] = ss2tf(sys)
[num, den] = ss2tf_custom(sys)

A = [0 1 0; 0 0 1; -8 -14 -7];
B = [0; 0; 1];
C = [15 5 0];
D = 0;

sys = ss(A, B, C, D);
disp('SYS2');
[num, den] = ss2tf(sys)
[num, den] = ss2tf_custom(sys)

disp('c2d');
num = [3.8978];        % Numerator
den = [1, 3.8140];  % Denominator
c2d(tf(num, den), 1)

num = [1.0193, 22.4826, 547.6238];        % Numerator
den = [1, 16.3824, 152.4330, 548.0400];  % Denominator
c2d(tf(num, den), 1)

