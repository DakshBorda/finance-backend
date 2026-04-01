const { StatusCodes } = require('http-status-codes');

/**
 * Wrapper for consistent API responses.
 *
 * Every response from this API follows the same shape,
 * making it predictable for frontend consumers.
 *
 * Success: { success: true, message, data }
 * Paginated: { success: true, message, data, pagination }
 */
class ApiResponse {
  /**
   * Send a success response.
   */
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

  /**
   * Send a success response with pagination metadata.
   * Used for list endpoints that return a subset of records.
   */
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

  /**
   * Send a created response (201).
   */
  static created(res, { message = 'Created successfully', data = null } = {}) {
    return ApiResponse.success(res, {
      statusCode: StatusCodes.CREATED,
      message,
      data,
    });
  }

  /**
   * Send a no-content response (204).
   * Used for successful deletes where there's nothing to return.
   */
  static noContent(res) {
    return res.status(StatusCodes.NO_CONTENT).send();
  }
}

module.exports = ApiResponse;
