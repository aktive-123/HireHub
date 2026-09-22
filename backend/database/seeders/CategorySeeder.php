<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['slug' => 'tech', 'name' => 'Technology', 'icon' => 'code-slash'],
            ['slug' => 'design', 'name' => 'Design', 'icon' => 'vector-pen'],
            ['slug' => 'marketing', 'name' => 'Marketing', 'icon' => 'megaphone'],
            ['slug' => 'finance', 'name' => 'Finance', 'icon' => 'cash-coin'],
            ['slug' => 'healthcare', 'name' => 'Healthcare', 'icon' => 'heart-pulse'],
            ['slug' => 'education', 'name' => 'Education', 'icon' => 'mortarboard'],
            ['slug' => 'sales', 'name' => 'Sales', 'icon' => 'graph-up-arrow'],
            ['slug' => 'support', 'name' => 'Support', 'icon' => 'headset'],
        ];

        foreach ($categories as $index => $category) {
            Category::updateOrCreate(['slug' => $category['slug']], [
                'name' => $category['name'],
                'icon' => $category['icon'],
                'sort_order' => $index,
                'status' => 'active',
            ]);
        }
    }
}
