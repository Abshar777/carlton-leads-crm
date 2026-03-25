"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Plus, Search, Filter, X, Edit2, Trash2,
  IndianRupee, ChevronLeft, ChevronRight, BookMarked,
  TrendingUp, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourses } from "@/hooks/useCourses";
import { CourseDialog } from "@/components/courses/CourseDialog";
import { DeleteCourseDialog } from "@/components/courses/DeleteCourseDialog";
import type { Course } from "@/types/course";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function CourseCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4 mt-3" />
        <Skeleton className="h-4 w-full mt-1" />
        <Skeleton className="h-4 w-2/3 mt-1" />
      </CardHeader>
      <CardFooter className="pt-0 border-t">
        <Skeleton className="h-4 w-24 mt-3" />
      </CardFooter>
    </Card>
  );
}

// ─── Course Card ─────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: Course;
  onEdit: (c: Course) => void;
  onDelete: (c: Course) => void;
  index: number;
}

function CourseCard({ course, onEdit, onDelete, index }: CourseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      layout
    >
      <Card className="group h-full overflow-hidden border-border/60 transition-all duration-200 hover:shadow-md hover:border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            {/* Icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
              <BookOpen className="h-5 w-5" />
            </div>

            {/* Status Badge */}
            <Badge
              variant={course.status === "active" ? "default" : "secondary"}
              className="text-xs"
            >
              {course.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Name */}
          <h3 className="mt-3 font-semibold text-foreground leading-snug line-clamp-1">
            {course.name}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {course.description || (
              <span className="italic text-muted-foreground/60">No description</span>
            )}
          </p>
        </CardHeader>

        <CardContent className="pb-3">
          {/* Amount */}
          <div className="flex items-center gap-1.5 text-lg font-bold text-foreground">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            {formatAmount(course.amount).replace("₹", "")}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Course fee</p>
        </CardContent>

        <CardFooter className="pt-3 border-t border-border/50 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {new Date(course.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(course)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(course)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const { data, isLoading } = useCourses({
    search: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    limit: 12,
  });

  const courses = data?.data ?? [];
  const pagination = data?.pagination;

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const openCreate = () => {
    setEditCourse(null);
    setDialogOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditCourse(course);
    setDialogOpen(true);
  };

  const openDelete = (course: Course) => {
    setDeleteCourse(course);
    setDeleteDialogOpen(true);
  };

  // Stats
  const totalCourses = pagination?.total ?? 0;
  const activeCourses = courses.filter((c) => c.status === "active").length;
  const avgAmount = courses.length
    ? courses.reduce((sum, c) => sum + c.amount, 0) / courses.length
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/60 bg-background/95 backdrop-blur-sm px-6 py-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookMarked className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Courses</h1>
              <p className="text-sm text-muted-foreground">
                Manage all available courses and programs
              </p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Add Course
          </Button>
        </div>
      </motion.div>

      {/* ── Stats Strip ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border/40"
      >
        {[
          { label: "Total Courses", value: totalCourses, icon: Package, color: "text-blue-500" },
          { label: "Active", value: activeCourses, icon: TrendingUp, color: "text-emerald-500" },
          {
            label: "Avg. Fee",
            value: formatAmount(avgAmount),
            icon: IndianRupee,
            color: "text-amber-500",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-muted ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 px-6 py-4 border-b border-border/40">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status */}
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No courses found</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {debouncedSearch || statusFilter !== "all"
                ? "Try adjusting your filters to see more courses."
                : "Get started by adding your first course."}
            </p>
            {!debouncedSearch && statusFilter === "all" && (
              <Button onClick={openCreate} className="mt-6 gap-2">
                <Plus className="h-4 w-4" />
                Add Course
              </Button>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {courses.map((course, i) => (
                <CourseCard
                  key={course._id}
                  course={course}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  index={i}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between border-t border-border/40 px-6 py-4"
        >
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {(page - 1) * 12 + 1}–{Math.min(page * 12, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">{pagination.total}</span> courses
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrevPage}
              onClick={() => setPage((p) => p - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-sm font-medium px-2">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <CourseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        course={editCourse}
      />
      <DeleteCourseDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        course={deleteCourse}
      />
    </div>
  );
}
