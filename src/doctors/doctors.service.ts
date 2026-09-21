import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FindDoctorsQueryDto } from './dto/find-doctors-query.dto';

const DOCTOR_PUBLIC_INCLUDE = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: FindDoctorsQueryDto) {
    return this.prisma.doctor.findMany({
      where: {
        isAvailable: true,
        user: { isActive: true },
        ...(query.specialization && {
          specialization: {
            contains: query.specialization,
            mode: 'insensitive',
          },
        }),
        ...(query.departmentId && {
          departmentId: query.departmentId,
        }),
      },
      include: DOCTOR_PUBLIC_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: DOCTOR_PUBLIC_INCLUDE,
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return doctor;
  }
}
