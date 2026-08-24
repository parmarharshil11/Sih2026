import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { extractIp } from '../../common/utils/extract-ip';
import { CourseService } from './course.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateModuleDto, UpdateModuleDto } from './dto/create-module.dto';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('api/v1')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  // ─── Categories ───────────────────────────────────────────────────────────────

  @Get('courses/categories')
  @UseGuards(JwtAuthGuard)
  listCategories(): Promise<any> {
    return this.courseService.listCategories();
  }

  @Post('courses/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  createCategory(@Body() dto: CreateCategoryDto): Promise<any> {
    return this.courseService.createCategory(dto);
  }

  // ─── Course CRUD ──────────────────────────────────────────────────────────────

  @Get('courses')
  @UseGuards(JwtAuthGuard)
  listCourses(
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ): Promise<any> {
    // Only admins/trainers may filter by non-published statuses
    const resolvedStatus = status as any;
    return this.courseService.listCourses({
      status: resolvedStatus,
      categoryId,
      difficulty,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainer')
  @HttpCode(HttpStatus.CREATED)
  createCourse(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCourseDto,
    @Req() req: Request,
  ): Promise<any> {
    return this.courseService.createCourse(userId, dto, extractIp(req));
  }

  @Get('courses/:id')
  @UseGuards(JwtAuthGuard)
  getCourse(@Param('id') id: string): Promise<any> {
    return this.courseService.getCourse(id);
  }

  @Patch('courses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainer', 'admin')
  updateCourse(
    @CurrentUser('id') userId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @Req() req: Request,
  ): Promise<any> {
    const isAdmin = user?.roles?.some((r: any) => r.name === 'admin');
    return this.courseService.updateCourse(userId, id, dto, isAdmin, extractIp(req));
  }

  @Delete('courses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainer', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCourse(
    @CurrentUser('id') userId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<any> {
    const isAdmin = user?.roles?.some((r: any) => r.name === 'admin');
    return this.courseService.deleteCourse(userId, id, isAdmin, extractIp(req));
  }

  @Post('courses/:id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainer')
  @HttpCode(HttpStatus.OK)
  submitForApproval(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<any> {
    return this.courseService.submitForApproval(userId, id, extractIp(req));
  }

  @Post('courses/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  approveCourse(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<any> {
    return this.courseService.approveCourse(userId, id, extractIp(req));
  }

  @Post('courses/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  rejectCourse(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<any> {
    return this.courseService.rejectCourse(userId, id, extractIp(req));
  }

  @Patch('courses/:id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainer', 'admin')
  @HttpCode(HttpStatus.OK)
  archiveCourse(
    @CurrentUser('id') userId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<any> {
    const isAdmin = user?.roles?.some((r: any) => r.name === 'admin');
    return this.courseService.archiveCourse(userId, id, isAdmin, extractIp(req));
  }

  // ─── Course Modules ───────────────────────────────────────────────────────────

  @Post('courses/:courseId/modules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainer')
  @HttpCode(HttpStatus.CREATED)
  addModule(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
    @Body() dto: CreateModuleDto,
  ): Promise<any> {
    return this.courseService.addModule(userId, courseId, dto);
  }

  @Patch('courses/:courseId/modules/:moduleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainer')
  updateModule(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: UpdateModuleDto,
  ): Promise<any> {
    return this.courseService.updateModule(userId, courseId, moduleId, dto);
  }

  @Delete('courses/:courseId/modules/:moduleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainer')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteModule(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
  ): Promise<any> {
    return this.courseService.deleteModule(userId, courseId, moduleId);
  }

  // ─── Enrollment & Progress ────────────────────────────────────────────────────

  @Post('enrollments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainee')
  @HttpCode(HttpStatus.CREATED)
  enroll(
    @CurrentUser('id') userId: string,
    @Body() dto: EnrollCourseDto,
    @Req() req: Request,
  ): Promise<any> {
    return this.courseService.enroll(userId, dto, extractIp(req));
  }

  @Get('enrollments/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainee')
  getMyEnrollments(@CurrentUser('id') userId: string): Promise<any> {
    return this.courseService.getMyEnrollments(userId);
  }

  @Get('enrollments/:id')
  @UseGuards(JwtAuthGuard)
  getEnrollment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<any> {
    return this.courseService.getEnrollment(id, userId);
  }

  @Patch('enrollments/:id/progress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainee')
  @HttpCode(HttpStatus.OK)
  updateProgress(
    @CurrentUser('id') userId: string,
    @Param('id') enrollmentId: string,
    @Body() dto: UpdateProgressDto,
  ): Promise<any> {
    return this.courseService.updateProgress(userId, enrollmentId, dto);
  }
}
