class ResponceFormatter {
  //Response formatter for success response
  static success(data, message = "success", statusCode = 200) {
    return {
      success: true,
      message,
      data,
      statusCode,
      timeStamp: new Date().toISOString(),
    };
  }

  //Response formatter for error response
  static error(message = "error", statusCode = 500, error = null) {
    return {
      success: false,
      message,
      error,
      statusCode,
      timeStamp: new Date().toISOString(),
    };
  }

  //Response formatter for validation error response
  static validationError(statusCode = 400, error = null) {
    return {
      success: false,
      message: "validation error",
      error,
      statusCode,
      timeStamp: new Date().toISOString(),
    };
  }

  //Response formatter for paginated response
  static paginated(data = null, page, limit, total) {
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timeStamp: new Date().toISOString(),
    };
  }
}

export default ResponceFormatter;
