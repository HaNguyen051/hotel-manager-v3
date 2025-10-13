import { Request, Response, NextFunction } from 'express';
// Middleware: Yêu cầu phải đăng nhập
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Middleware: Yêu cầu phải là ADMIN
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  if (req.session.user.role !== 'ADMIN') {
    return res.status(403).send('Bạn không có quyền truy cập trang này');
  }
  
  next();
};

// Middleware: Yêu cầu phải là CUSTOMER
export const requireCustomer = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  if (req.session.user.role !== 'CUSTOMER') {
    return res.status(403).send('Trang này chỉ dành cho khách hàng');
  }
  
  next();
};