import { prisma } from './client';
import bcrypt from 'bcrypt';

const initDatabase = async () => {
    try {
        console.log('Khởi tạo database...');

        // ==================== TẠO ROLES ====================
        const roleCount = await prisma.role.count();
        if (roleCount === 0) {
            console.log('Tạo roles...');
            await prisma.role.createMany({
                data: [
                    { name: 'ADMIN', description: 'Quản trị viên - Full quyền' },
                    { name: 'USER', description: 'Người dùng/Khách hàng thông thường' }
                ],
            });
            console.log('Đã tạo roles');
        } else {
            console.log('Roles đã tồn tại');
        }

        // ==================== TẠO ADMIN USER ====================
        const adminRole = await prisma.role.findUnique({
            where: { name: 'ADMIN' },
        });

        if (adminRole) {
            const adminUser = await prisma.user.findFirst({
                where: { roleId: adminRole.id },
            });

            if (!adminUser) {
                console.log('Tạo tài khoản Admin...');
                const hashedPassword = await bcrypt.hash('admin123', 10);
                await prisma.user.create({
                    data: {
                        username: 'admin@hotel.com',
                        password: hashedPassword,
                        fullName: 'Administrator',
                        accountType: 'SYSTEM',
                        roleId: adminRole.id,
                        phone: '0123456789',
                        address: 'Hà Nội'
                    },
                });
                console.log('Đã tạo Admin');
                console.log('Email: admin@hotel.com');
                console.log('Password: admin123');
            } else {
                console.log('Tài khoản Admin đã tồn tại');
            }
        }

        // ==================== TẠO USER MẪU ====================
        const userRole = await prisma.role.findUnique({
            where: { name: 'USER' },
        });

        if (userRole) {
            const normalUser = await prisma.user.findFirst({
                where: { 
                    roleId: userRole.id,
                    username: 'user@example.com'
                },
            });

            if (!normalUser) {
                console.log('Tạo tài khoản User mẫu...');
                const hashedPassword = await bcrypt.hash('user123', 10);
                await prisma.user.create({
                    data: {
                        username: 'user@example.com',
                        password: hashedPassword,
                        fullName: 'Nguyễn Văn A',
                        accountType: 'CUSTOMER',
                        roleId: userRole.id,
                        phone: '0987654321',
                        address: 'Hà Nội, Việt Nam'
                    },
                });
                console.log('Đã tạo User mẫu');
                console.log('Email: user@example.com');
                console.log('Password: user123');
            } else {
                console.log('Tài khoản User mẫu đã tồn tại');
            }
        }

        // ==================== TẠO PHÒNG MẪU ====================
        const roomCount = await prisma.room.count();
        if (roomCount === 0) {
            console.log('Tạo phòng mẫu...');
            await prisma.room.createMany({
                data: [
                    {
                        name: 'Phòng Standard 101',
                        type: 'Standard',
                        price: 500000,
                        capacity: 2,
                        status: 'AVAILABLE',
                        image :'' , 
                        description: 'Phòng tiêu chuẩn với đầy đủ tiện nghi cơ bản'
                    },
                    {
                        name: 'Phòng Deluxe 201',
                        type: 'Deluxe',
                        price: 800000,
                        capacity: 2,
                        status: 'AVAILABLE',
                        image :'' , 
                        description: 'Phòng cao cấp rộng rãi với view đẹp'
                    },
                    {
                        name: 'Phòng Suite 301',
                        type: 'Suite',
                        price: 1500000,
                        capacity: 4,
                        status: 'AVAILABLE',
                        image :'' , 
                        description: 'Phòng VIP sang trọng với phòng khách riêng'
                    },
                    {
                        name: 'Phòng Family 102',
                        type: 'Family',
                        price: 1200000,
                        capacity: 4,
                        status: 'AVAILABLE',
                        image :'' , 
                        description: 'Phòng gia đình rộng rãi'
                    },
                    {
                        name: 'Phòng Presidential 401',
                        type: 'Presidential',
                        price: 3000000,
                        capacity: 6,
                        status: 'AVAILABLE',
                        image :'' , 
                        description: 'Phòng tổng thống đẳng cấp nhất'
                    }
                ],
            });
            console.log('Đã tạo 5 phòng mẫu');
        } else {
            console.log('Phòng đã tồn tại');
        }

        // ==================== TẠO DỊCH VỤ MẪU ====================
        const serviceCount = await prisma.service.count();
        if (serviceCount === 0) {
            console.log('Tạo dịch vụ mẫu...');
            await prisma.service.createMany({
                data: [
                    {
                        name: 'Dịch vụ phòng',
                        price: 50000,
                        shortDesc: 'Giao đồ ăn uống tận phòng',
                        description: 'Dịch vụ phòng 24/7 với thực đơn phong phú',
                        isActive: true
                    },
                    {
                        name: 'Giặt ủi',
                        price: 100000,
                        shortDesc: 'Giặt ủi quần áo chuyên nghiệp',
                        description: 'Dịch vụ giặt ủi nhanh trong ngày',
                        isActive: true
                    },
                    {
                        name: 'Đưa đón sân bay',
                        price: 300000,
                        shortDesc: 'Đưa đón sân bay tiện lợi',
                        description: 'Xe riêng đưa đón từ/đến sân bay',
                        isActive: true
                    },
                    {
                        name: 'Spa & Massage',
                        price: 500000,
                        shortDesc: 'Dịch vụ spa thư giãn',
                        description: 'Massage truyền thống và các liệu trình spa',
                        isActive: true
                    }
                ],
            });
            console.log(' Đã tạo 4 dịch vụ mẫu');
        } else {
            console.log('Dịch vụ đã tồn tại');
        }

        console.log('\nDatabase đã sẵn sàng!');
        console.log('\nTài khoản mặc định:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(' ADMIN:');
        console.log('  Email: admin@hotel.com');
        console.log('  Password: admin123');
        console.log(' USER:');
        console.log('  Email: user@example.com');
        console.log('  Password: user123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('Lỗi khởi tạo database:', error);
        throw error;
    }
};

export default initDatabase;