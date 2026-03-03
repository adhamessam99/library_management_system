const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

const validate = (schema) => async (req, res, next) => {
  try {
    const validated = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    req.validated = validated;
    req.body = validated.body || req.body;
    req.query = validated.query || req.query;
    req.params = validated.params || req.params;

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = new AppError('Validation failed', 400);
      
      validationError.errors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return next(validationError);
    }
    next(error);
  }
};

module.exports = { validate };