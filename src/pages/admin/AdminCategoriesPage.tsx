
import React from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { CategoriesManager } from "@/components/admin/categories/CategoriesManager";
import { FolderTree } from "lucide-react";

export default function AdminCategoriesPage() {
  return (
    <>
      <PageSEO title="Gerenciar Categorias" description="Administre as categorias de produtos do sistema." path="/admin/categories" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <FolderTree className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Categorias</h1>
            <p className="text-muted-foreground">Gerencie a árvore de categorias e atributos dos produtos</p>
          </div>
        </div>
        
        <CategoriesManager />
      </div>
    </>
  );
}
