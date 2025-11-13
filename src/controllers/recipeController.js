import ProductRecipe from '../models/ProductRecipe.js';
import RecipeMaterial from '../models/RecipeMaterial.js';
import Product from '../models/Product.js';
import RawMaterial from '../models/RawMaterial.js';
import { generateRecipeId, generateRecipeMaterialId } from '../utils/idGenerator.js';

// SQM calculation is now handled by Product model virtual field

// Create a new product recipe
export const createProductRecipe = async (req, res) => {
  try {
    const { product_id, materials, description, version, created_by } = req.body;

    // Validate product exists
    const product = await Product.findOne({ id: product_id });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check if recipe already exists
    const existingRecipe = await ProductRecipe.findOne({ product_id });
    if (existingRecipe) {
      return res.status(400).json({
        success: false,
        error: 'Recipe already exists for this product'
      });
    }

    // Get product SQM (automatically calculated by virtual field)
    const productSQM = product.sqm;

    // Create recipe
    const recipe = new ProductRecipe({
      id: await generateRecipeId(),
      product_id,
      product_name: product.name,
      base_unit: 'sqm',
      created_by: created_by || 'system',
      description,
      version: version || '1.0'
    });

    await recipe.save();

    // Create recipe materials
    const recipeMaterials = [];
    let totalCostPerSQM = 0;

    for (const material of materials) {
      // Validate material exists
      let materialDoc;
      if (material.material_type === 'raw_material') {
        materialDoc = await RawMaterial.findOne({ id: material.material_id });
      } else if (material.material_type === 'product') {
        materialDoc = await Product.findOne({ id: material.material_id });
      }

      if (!materialDoc) {
        return res.status(400).json({
          success: false,
          error: `Material not found: ${material.material_id}`
        });
      }

      const recipeMaterial = new RecipeMaterial({
        id: await generateRecipeMaterialId(),
        recipe_id: recipe.id,
        material_id: material.material_id,
        material_name: material.material_name,
        material_type: material.material_type,
        quantity_per_sqm: material.quantity_per_sqm,
        unit: material.unit,
        cost_per_unit: material.cost_per_unit || 0,
        specifications: material.specifications,
        quality_requirements: material.quality_requirements,
        is_optional: material.is_optional || false,
        waste_factor: material.waste_factor || 0
      });

      await recipeMaterial.save();
      recipeMaterials.push(recipeMaterial);
      totalCostPerSQM += recipeMaterial.total_cost_per_sqm;
    }

    // Update recipe with total cost
    recipe.total_cost_per_sqm = totalCostPerSQM;
    await recipe.save();

    // Update product to indicate it has a recipe
    product.has_recipe = true;
    await product.save();

    res.status(201).json({
      success: true,
      data: {
        recipe,
        materials: recipeMaterials,
        product_sqm: productSQM,
        total_cost_per_sqm: totalCostPerSQM
      }
    });
  } catch (error) {
    console.error('Error creating product recipe:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get recipe by product ID
export const getRecipeByProductId = async (req, res) => {
  try {
    const { product_id } = req.params;

    const recipe = await ProductRecipe.findOne({ product_id });
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found for this product'
      });
    }

    const materials = await RecipeMaterial.find({ recipe_id: recipe.id });

    res.json({
      success: true,
      data: {
        ...recipe.toObject(),
        materials: materials
      }
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Calculate materials needed for production
export const calculateProductionMaterials = async (req, res) => {
  try {
    const { product_id, production_quantity } = req.body;

    // Get product and recipe
    const product = await Product.findOne({ id: product_id });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const recipe = await ProductRecipe.findOne({ product_id });
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found for this product'
      });
    }

    // Get product SQM (automatically calculated by virtual field)
    const productSQM = product.sqm;

    // Get recipe materials
    const materials = await RecipeMaterial.find({ recipe_id: recipe.id });

    // Calculate total SQM needed
    const totalSQM = productSQM * production_quantity;

    // Calculate materials needed
    const materialsNeeded = materials.map(material => {
      const effectiveQuantity = material.effective_quantity_per_sqm;
      const totalQuantity = effectiveQuantity * totalSQM;
      const totalCost = totalQuantity * material.cost_per_unit;

      return {
        material_id: material.material_id,
        material_name: material.material_name,
        material_type: material.material_type,
        quantity_per_sqm: material.quantity_per_sqm,
        effective_quantity_per_sqm: effectiveQuantity,
        total_quantity_needed: totalQuantity,
        unit: material.unit,
        cost_per_unit: material.cost_per_unit,
        total_cost: totalCost,
        specifications: material.specifications,
        quality_requirements: material.quality_requirements,
        is_optional: material.is_optional,
        waste_factor: material.waste_factor
      };
    });

    const totalCost = materialsNeeded.reduce((sum, material) => sum + material.total_cost, 0);

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          length: product.length,
          width: product.width,
          length_unit: product.length_unit,
          width_unit: product.width_unit,
          sqm_per_unit: productSQM
        },
        production: {
          quantity: production_quantity,
          total_sqm: totalSQM,
          total_cost: totalCost
        },
        materials: materialsNeeded
      }
    });
  } catch (error) {
    console.error('Error calculating production materials:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update recipe
export const updateRecipe = async (req, res) => {
  try {
    const { recipe_id } = req.params;
    const updateData = req.body;

    const recipe = await ProductRecipe.findOne({ id: recipe_id });
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }

    Object.assign(recipe, updateData);
    await recipe.save();

    res.json({
      success: true,
      data: recipe
    });
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Add material to recipe
export const addMaterialToRecipe = async (req, res) => {
  try {
    const { recipe_id } = req.params;
    const materialData = req.body;

    // Validate recipe exists
    const recipe = await ProductRecipe.findOne({ id: recipe_id });
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }

    // Validate material exists
    let materialDoc;
    if (materialData.material_type === 'raw_material') {
      materialDoc = await RawMaterial.findOne({ id: materialData.material_id });
    } else if (materialData.material_type === 'product') {
      materialDoc = await Product.findOne({ id: materialData.material_id });
    }

    if (!materialDoc) {
      return res.status(400).json({
        success: false,
        error: `Material not found: ${materialData.material_id}`
      });
    }

    const recipeMaterial = new RecipeMaterial({
      id: await generateRecipeMaterialId(),
      recipe_id,
      material_id: materialData.material_id,
      material_name: materialData.material_name,
      material_type: materialData.material_type,
      quantity_per_sqm: materialData.quantity_per_sqm,
      unit: materialData.unit,
      cost_per_unit: materialData.cost_per_unit || 0,
      specifications: materialData.specifications,
      quality_requirements: materialData.quality_requirements,
      is_optional: materialData.is_optional || false,
      waste_factor: materialData.waste_factor || 0
    });

    await recipeMaterial.save();

    // Update recipe total cost
    recipe.total_cost_per_sqm += recipeMaterial.total_cost_per_sqm;
    await recipe.save();

    res.status(201).json({
      success: true,
      data: recipeMaterial
    });
  } catch (error) {
    console.error('Error adding material to recipe:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Remove material from recipe
export const removeMaterialFromRecipe = async (req, res) => {
  try {
    const { recipe_id, material_id } = req.params;

    const recipeMaterial = await RecipeMaterial.findOneAndDelete({
      recipe_id,
      material_id
    });

    if (!recipeMaterial) {
      return res.status(404).json({
        success: false,
        error: 'Material not found in recipe'
      });
    }

    // Update recipe total cost
    const recipe = await ProductRecipe.findOne({ id: recipe_id });
    if (recipe) {
      recipe.total_cost_per_sqm -= recipeMaterial.total_cost_per_sqm;
      await recipe.save();
    }

    res.json({
      success: true,
      message: 'Material removed from recipe'
    });
  } catch (error) {
    console.error('Error removing material from recipe:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete recipe
export const deleteRecipe = async (req, res) => {
  try {
    const { recipe_id } = req.params;

    // Delete recipe materials first
    await RecipeMaterial.deleteMany({ recipe_id });

    // Delete recipe
    const recipe = await ProductRecipe.findOneAndDelete({ id: recipe_id });
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }

    // Update product to indicate no recipe
    const product = await Product.findOne({ id: recipe.product_id });
    if (product) {
      product.has_recipe = false;
      await product.save();
    }

    res.json({
      success: true,
      message: 'Recipe deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all recipes
export const getAllRecipes = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const recipes = await ProductRecipe.find({})
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Populate materials for each recipe
    const recipesWithMaterials = await Promise.all(recipes.map(async (recipe) => {
      const materials = await RecipeMaterial.find({ recipe_id: recipe.id });
      return {
        ...recipe.toObject(),
        materials: materials
      };
    }));

    const count = await ProductRecipe.countDocuments({});

    res.json({
      success: true,
      data: recipesWithMaterials,
      count
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
