const { PAGINATION } = require('../config/constants');

const parsePagination = (query = {}) => {
  const requestedPage = Number(query.page);
  const requestedLimit = Number(query.limit);

  const page = Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.floor(requestedPage)
    : PAGINATION.DEFAULT_PAGE;

  const limitCandidate = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.floor(requestedLimit)
    : PAGINATION.DEFAULT_LIMIT;

  const limit = Math.min(limitCandidate, PAGINATION.MAX_LIMIT);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
};

module.exports = {
  parsePagination,
};