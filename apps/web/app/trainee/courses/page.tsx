'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { CourseCard } from '@/components/CourseCard';
import { Search, Filter, BookOpen } from 'lucide-react';

export default function CourseCatalogPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/courses/categories').then((res) => setCategories(res)).catch(() => {});
  }, []);

  useEffect(() => {
    setIsLoading(true);
    let query = `/courses?page=1&limit=20`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (selectedCategory) query += `&categoryId=${selectedCategory}`;
    if (selectedDifficulty) query += `&difficulty=${selectedDifficulty}`;

    api
      .get(query)
      .then((res) => setCourses(res.data || []))
      .catch(() => setCourses([]))
      .finally(() => setIsLoading(false));
  }, [search, selectedCategory, selectedDifficulty]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Industrial Course Catalog
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Filter multi-module capacity building courses by difficulty, technology domain, and prerequisite skills.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses, skills, topics..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 text-xs font-semibold"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 text-xs font-semibold"
          >
            <option value="">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl h-64 animate-pulse"></div>
          ))}
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              category={course.category?.name || 'Technology'}
              difficulty={course.difficulty}
              durationMinutes={course.durationMinutes}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
          No courses matching your filter criteria.
        </div>
      )}
    </div>
  );
}
