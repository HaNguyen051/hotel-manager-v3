//hehehe
import express, { Express } from 'express';
import usersController from '../controllers/admin/users.controller'

const router = express.Router();

const webAdmin = (app :Express) => {
    // Dashboard
    router.get('/', (req, res) => {
        res.render('admin/dashboard/dashboard', {
            title: 'Dashboard'
        });
    });

    // Users routes
    router.get('/users', usersController.getAllUsers);
    router.get('/create-user', usersController.getCreateUser);
    router.post('/handle-create-user', usersController.handleCreateUser);
    router.get('/handle-view-user/:id', usersController.handleViewUser);
    router.get('/handle-edit-user/:id', usersController.getEditUser);
    router.post('/handle-update-user/:id', usersController.handleUpdateUser);
    router.post('/handle-delete-user/:id', usersController.handleDeleteUser);

    // Rooms routes
    app.use('/admin', router);
}; 
export default webAdmin