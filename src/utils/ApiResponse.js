const { StatusCodes } = require('http-status-codes');

// Consistent response envelope for all API endpoints.
// Success: { success: true, message, data }
// Paginated: { success: true, message, data, pagination }
class ApiResponse {

  static success(res, { statusCode = StatusCodes.OK, message = 'Success', data = null } = {}) {
    const response = {
      success: true,
      message,
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  static paginated(res, { data, page, limit, total, message = 'Success' } = {}) {
    return res.status(StatusCodes.OK).json({
      success: true,
      message,
      data,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  static created(res, { message = 'Created successfully', data = null } = {}) {
    return ApiResponse.success(res, {
      statusCode: StatusCodes.CREATED,
      message,
      data,
    });
  }

  static noContent(res) {
    return res.status(StatusCodes.NO_CONTENT).send();
  }
}

module.exports = ApiResponse;
