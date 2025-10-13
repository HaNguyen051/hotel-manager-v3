import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const usersController = {
  // Hiển thị danh sách users
  getAllUsers: async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
      });

      res.render('admin/users/show', {
        users,
        title: 'Manage Users'
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send('Server Error');
    }
  },

  // Hiển thị form tạo user
  getCreateUser: (req: Request, res: Response) => {
    res.render('admin/users/create', {
      title: 'Create User',
      errors: {},
      formData: {}
    });
  },

  // Xử lý tạo user
  handleCreateUser: async (req: Request, res: Response) => {
    try {
      const { name, email, phone, password, role } = req.body;

      // Validate
      const errors: any = {};
      if (!name || name.trim() === '') {
        errors.name = 'Tên không được để trống';
      }
      if (!email || email.trim() === '') {
        errors.email = 'Email không được để trống';
      }
      if (!password || password.trim() === '') {
        errors.password = 'Password không được để trống';
      }

      // Check email đã tồn tại
      if (email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: email.trim() }
        });
        if (existingUser) {
          errors.email = 'Email đã được sử dụng';
        }
      }

      if (Object.keys(errors).length > 0) {
        return res.render('admin/users/create', {
          title: 'Create User',
          errors,
          formData: req.body
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Tạo user
      await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.trim(),
          phone: phone?.trim() || null,
          password: hashedPassword,
          role: role || 'CUSTOMER'
        }
      });

      res.redirect('/admin/users');
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).send('Error creating user');
    }
  },

  // Xem chi tiết user
  handleViewUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        include: {
          bookings: {
            include: {
              room: true
            },
            orderBy: { createdAt: 'desc' }
          },
          payments: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!user) {
        return res.status(404).send('User not found');
      }

      res.render('admin/users/detail', {
        title: 'User Detail',
        user
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).send('Server Error');
    }
  },

  // Hiển thị form edit
  getEditUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) }
      });

      if (!user) {
        return res.status(404).send('User not found');
      }

      res.render('admin/users/edit', {
        title: 'Edit User',
        user,
        errors: {}
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).send('Server Error');
    }
  },

  // Xử lý cập nhật user
  handleUpdateUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, email, phone, password, role } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) }
      });

      if (!user) {
        return res.status(404).send('User not found');
      }

      // Validate
      const errors: any = {};
      if (!name || name.trim() === '') {
        errors.name = 'Tên không được để trống';
      }
      if (!email || email.trim() === '') {
        errors.email = 'Email không được để trống';
      }

      // Check email trùng (trừ chính user này)
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: email.trim(),
            NOT: { id: parseInt(id) }
          }
        });
        if (existingUser) {
          errors.email = 'Email đã được sử dụng';
        }
      }

      if (Object.keys(errors).length > 0) {
        return res.render('admin/users/edit', {
          title: 'Edit User',
          user: { ...user, ...req.body },
          errors
        });
      }

      // Prepare data
      const updateData: any = {
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        role: role || 'CUSTOMER'
      };

      // Nếu có password mới thì hash
      if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10);
      }

      await prisma.user.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      res.redirect('/admin/users');
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).send('Error updating user');
    }
  },

  // Xóa user
  handleDeleteUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check xem user có booking/payment không
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        include: {
          _count: {
            select: { bookings: true, payments: true }
          }
        }
      });

      if (!user) {
        return res.status(404).send('User not found');
      }

      if (user._count.bookings > 0 || user._count.payments > 0) {
        return res.status(400).send('Không thể xóa user có booking hoặc payment');
      }

      await prisma.user.delete({
        where: { id: parseInt(id) }
      });

      res.redirect('/admin/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).send('Error deleting user');
    }
  }
};

export default usersController;