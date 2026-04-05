const { StatusCodes } = require('http-status-codes');
const AuthService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');

const register = catchAsync(async (req, res) => {
  const { user, tokens } = await AuthService.register(req.body);
  ApiResponse.created(res, {
    message: 'User registered successfully',
    data: { user, tokens },
  });
});

const login = catchAsync(async (req, res) => {
  const { user, tokens } = await AuthService.login(req.body);
  ApiResponse.success(res, {
    message: 'Login successful',
    data: { user, tokens },
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const { tokens } = await AuthService.refreshToken(req.body.refreshToken);
  ApiResponse.success(res, {
    message: 'Token refreshed successfully',
    data: { tokens },
  });
});

const getProfile = catchAsync(async (req, res) => {
  const user = await AuthService.getProfile(req.user.id);
  ApiResponse.success(res, { data: { user } });
});

const updateProfile = catchAsync(async (req, res) => {
  const user = await AuthService.updateProfile(req.user.id, req.body);
  ApiResponse.success(res, {
    message: 'Profile updated successfully',
    data: { user },
  });
});

const changePassword = catchAsync(async (req, res) => {
  const result = await AuthService.changePassword(req.user.id, req.body);
  ApiResponse.success(res, { message: result.message });
});

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
};
