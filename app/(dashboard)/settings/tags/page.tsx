"use client";
import { motion } from "framer-motion";
import { Tag, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TagManager } from "@/components/tags/TagManager";

export default function TagSettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Tag Manager</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage tags for categorizing and filtering leads
          </p>
        </div>
      </div>

      {/* Tag Manager */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <TagManager />
        </CardContent>
      </Card>
    </motion.div>
  );
}
