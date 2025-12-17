export function attachLocals() {
  return (req, res, next) => {
    res.locals.user = req.session?.user || null;
    next();
  };
}
