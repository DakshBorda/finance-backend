const UserService = require('../services/user.service');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');

const listUsers = catchAsync(async (req, res) => {
  const { users, total, page, limit } = await UserService.listUsers(req.query);
  ApiResponse.paginated(res, { data: users, page, limit, total });
});

const getUserById = catchAsync(async (req, res) => {
  const user = await UserService.getUserById(req.params.id);
  ApiResponse.success(res, { data: { user } });
});

const updateUser = catchAsync(async (req, res) => {
  const user = await UserService.updateUser(req.params.id, req.user.id, req.body);
  ApiResponse.success(res, {
    message: 'User updated successfully',
    data: { user },
  });
});

const deleteUser = catchAsync(async (req, res) => {
  const user = await UserService.softDeleteUser(req.params.id, req.user.id);
  ApiResponse.success(res, {
    message: 'User deleted successfully',
    data: { user },
  });
});

const restoreUser = catchAsync(async (req, res) => {
  const user = await UserService.restoreUser(req.params.id, req.user.id);
  ApiResponse.success(res, {
    message: 'User restored successfully',
    data: { user },
  });
});

module.exports = { listUsers, getUserById, updateUser, deleteUser, restoreUser };
