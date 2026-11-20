/**
 * @file scripts/mcp-server/tools.js
 * @description Catalog of Model Context Protocol (MCP) tool schemas for Geovanta Vector Studio (17 Full Tools)
 */

const TOOL_DEFINITIONS = [
  {
    name: 'geovanta_status',
    description:
      'Check Geovanta MCP server health, live connection status (WebSocket or Cloud HTTP Bridge), active screen (workspace or editor), and active project info.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'geovanta_workspace_manage',
    description:
      'Manage Geovanta Workspace & Projects visible on screen: list all projects, create and open a new project, open an existing project, rename, duplicate, favorite, move to trash, restore from trash, delete permanently, navigate back to the Workspace Home screen, or open the Settings modal.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'list_projects',
            'create_project',
            'open_project',
            'rename_project',
            'duplicate_project',
            'toggle_favorite',
            'trash_project',
            'restore_project',
            'delete_project',
            'back_to_workspace',
            'open_settings'
          ],
          description: 'Workspace or project operation to perform on the connected Geovanta application'
        },
        projectId: {
          type: 'string',
          description: 'Target project ID (if omitted, matches by name or uses currently active project)'
        },
        name: {
          type: 'string',
          description: 'Project name (for create_project, rename_project, or searching project to open)'
        },
        width: {
          type: 'number',
          description: 'Artboard width in pixels when creating a new project (default 800)'
        },
        height: {
          type: 'number',
          description: 'Artboard height in pixels when creating a new project (default 600)'
        },
        bg: {
          type: 'string',
          description: 'Artboard background color hex when creating a new project (default #ffffff)'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'geovanta_shape_create',
    description:
      'Create a parametric vector shape (rectangle, circle, star, polygon, spiral, blob, weave) and insert into active Geovanta canvas or export as SVG string.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['rectangle', 'circle', 'star', 'polygon', 'spiral', 'blob', 'weave'],
          description: 'The type of vector shape to create'
        },
        x: { type: 'number', description: 'X coordinate in artboard units' },
        y: { type: 'number', description: 'Y coordinate in artboard units' },
        width: { type: 'number', description: 'Width of shape' },
        height: { type: 'number', description: 'Height of shape' },
        cx: { type: 'number', description: 'Center X coordinate' },
        cy: { type: 'number', description: 'Center Y coordinate' },
        radius: { type: 'number', description: 'Radius for circle, polygon, or star' },
        innerRadius: { type: 'number', description: 'Inner radius for star' },
        outerRadius: { type: 'number', description: 'Outer radius for star' },
        points: { type: 'number', description: 'Number of points for star or blob' },
        sides: { type: 'number', description: 'Number of sides for polygon' },
        turns: { type: 'number', description: 'Number of spiral revolutions' },
        irregularity: { type: 'number', description: 'Blob irregularity factor (0 to 1)' },
        smoothness: { type: 'number', description: 'Blob smoothness factor (0 to 1)' },
        cols: { type: 'number', description: 'Weave column count' },
        rows: { type: 'number', description: 'Weave row count' },
        amplitude: { type: 'number', description: 'Weave amplitude' },
        thickness: { type: 'number', description: 'Weave strip thickness' },
        waveType: {
          type: 'string',
          enum: ['sine', 'triangle', 'square'],
          description: 'Wave type for weave generator'
        },
        fill: { type: 'string', description: "Hex color, rgb, or 'none' for fill" },
        stroke: { type: 'string', description: "Hex color, rgb, or 'none' for stroke" },
        strokeWidth: { type: 'number', description: 'Width of stroke outline' },
        opacity: { type: 'number', description: 'Object opacity from 0.0 to 1.0' },
        name: { type: 'string', description: 'Display name for the layer/object' },
        target: {
          type: 'string',
          enum: ['canvas', 'svg'],
          description:
            "Where to route output: 'canvas' mutates active Geovanta editor (or opens new doc), 'svg' returns raw SVG string"
        }
      },
      required: ['type']
    }
  },
  {
    name: 'geovanta_text_create',
    description:
      'Create and style a typography / text layer on the active Geovanta canvas (automatically opens a new project if on the Workspace screen).',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text content to display on canvas' },
        x: { type: 'number', description: 'X position on artboard (default 100)' },
        y: { type: 'number', description: 'Y position on artboard (default 150)' },
        fontSize: { type: 'number', description: 'Font size in pixels (default 48)' },
        fontFamily: { type: 'string', description: 'Font family name (default IBM Plex Sans)' },
        fontWeight: { type: 'string', description: "Font weight ('normal', 'bold', '600', '700')" },
        fontStyle: { type: 'string', enum: ['normal', 'italic'], description: 'Font style' },
        fill: { type: 'string', description: 'Text fill color hex (default #111827)' },
        stroke: { type: 'string', description: 'Text outline stroke color' },
        strokeWidth: { type: 'number', description: 'Text outline stroke width' },
        opacity: { type: 'number', description: 'Layer opacity (0.0 to 1.0)' },
        name: { type: 'string', description: 'Layer name in the Layers sidebar' }
      },
      required: ['text']
    }
  },
  {
    name: 'geovanta_iconify_insert',
    description:
      'Insert a vector icon from Iconify (e.g. "mdi:home", "lucide:sparkles", "tabler:star", "ph:rocket-launch-fill") onto the active Geovanta canvas.',
    inputSchema: {
      type: 'object',
      properties: {
        icon: {
          type: 'string',
          description: 'Full Iconify icon identifier in "prefix:name" format (e.g. "mdi:rocket", "lucide:heart")'
        },
        x: { type: 'number', description: 'Target X coordinate on artboard' },
        y: { type: 'number', description: 'Target Y coordinate on artboard' },
        size: { type: 'number', description: 'Target width/height in pixels (default 96)' },
        fill: { type: 'string', description: 'Optional fill color override hex' }
      },
      required: ['icon']
    }
  },
  {
    name: 'geovanta_layer_manage',
    description:
      'Inspect and manipulate layers/objects on the active Geovanta canvas: list layers, update fill/stroke/opacity/gradients/effects, move/scale/rotate, reorder z-index (bring to front/send to back), duplicate, delete, rename, lock/unlock, or hide/show.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'list_layers',
            'update_style',
            'transform',
            'reorder',
            'duplicate',
            'delete',
            'rename',
            'visibility',
            'lock'
          ],
          description: 'Layer operation to execute'
        },
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Target object/layer IDs (if omitted, applies to current selection or latest object)'
        },
        name: { type: 'string', description: 'New layer name (for rename) or name filter' },
        fill: { type: 'string', description: 'New fill color hex or "none"' },
        stroke: { type: 'string', description: 'New stroke color hex or "none"' },
        strokeWidth: { type: 'number', description: 'New stroke width' },
        opacity: { type: 'number', description: 'New opacity (0 to 1)' },
        dx: { type: 'number', description: 'Horizontal move offset in pixels (for transform)' },
        dy: { type: 'number', description: 'Vertical move offset in pixels (for transform)' },
        scale: { type: 'number', description: 'Uniform scale multiplier (e.g. 1.5 or 0.5 for transform)' },
        rotate: { type: 'number', description: 'Rotation angle in degrees (for transform)' },
        order: {
          type: 'string',
          enum: ['bring_to_front', 'send_to_back', 'bring_forward', 'send_backward'],
          description: 'Z-order direction (for reorder)'
        },
        hidden: { type: 'boolean', description: 'Whether layer should be hidden (for visibility)' },
        locked: { type: 'boolean', description: 'Whether layer should be locked (for lock)' }
      },
      required: ['action']
    }
  },
  {
    name: 'geovanta_artboard_and_view',
    description:
      'Control the Geovanta Editor Artboard, Active Toolbar Tool, Undo/Redo History, Canvas Zoom/Pan, and UI Theme/Accent.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['resize_artboard', 'set_tool', 'undo', 'redo', 'set_zoom', 'set_theme'],
          description: 'Artboard, history, toolbar, or UI view action to perform'
        },
        width: { type: 'number', description: 'New artboard width in pixels (for resize_artboard)' },
        height: { type: 'number', description: 'New artboard height in pixels (for resize_artboard)' },
        bg: { type: 'string', description: 'New artboard background color hex (for resize_artboard)' },
        tool: {
          type: 'string',
          enum: ['select', 'node', 'pen', 'curvature', 'shape', 'text', 'shapeBuilder', 'iconify', 'hand'],
          description: 'Toolbar tool to activate (for set_tool)'
        },
        zoom: { type: 'number', description: 'Canvas zoom level, e.g. 1.0 for 100%, 2.0 for 200% (for set_zoom)' },
        theme: {
          type: 'string',
          enum: ['light', 'dark', 'system'],
          description: 'Application UI theme mode (for set_theme)'
        },
        accent: { type: 'string', description: 'Application UI accent color hex (for set_theme)' }
      },
      required: ['action']
    }
  },
  {
    name: 'geovanta_curve_simplify',
    description:
      'Topological curve simplification that reduces redundant collinear and dense anchor points while preserving curve fidelity.',
    inputSchema: {
      type: 'object',
      properties: {
        svgString: { type: 'string', description: 'Input SVG XML markup if running in headless mode' },
        level: { type: 'number', description: 'Simplification aggressiveness (0 to 100, default 100)' },
        tolerance: { type: 'number', description: 'Tolerance threshold in pixels' },
        target: { type: 'string', enum: ['canvas', 'svg'], description: 'Target destination' }
      }
    }
  },
  {
    name: 'geovanta_boolean_operation',
    description:
      'Perform constructive area geometry boolean operations (union, subtract, intersect, exclude) on overlapping vector paths.',
    inputSchema: {
      type: 'object',
      properties: {
        op: {
          type: 'string',
          enum: ['union', 'subtract', 'intersect', 'exclude'],
          description: 'Boolean operation to execute'
        },
        svgString: { type: 'string', description: 'Input SVG XML markup containing multiple shapes' },
        target: { type: 'string', enum: ['canvas', 'svg'] }
      },
      required: ['op']
    }
  },
  {
    name: 'geovanta_corner_fillet',
    description: 'Apply rounded corner fillets with exact radius to sharp path vertex nodes.',
    inputSchema: {
      type: 'object',
      properties: {
        radius: { type: 'number', description: 'Corner fillet radius in artboard units' },
        mode: { type: 'string', enum: ['circular', 'proportional'], description: 'Fillet curvature mode' },
        svgString: { type: 'string', description: 'Input SVG XML markup' },
        target: { type: 'string', enum: ['canvas', 'svg'] }
      },
      required: ['radius']
    }
  },
  {
    name: 'geovanta_recolor',
    description: 'Recolor vector objects by replacing specific color values or applying a whole palette shift.',
    inputSchema: {
      type: 'object',
      properties: {
        find: { type: 'string', description: 'Color to find (hex/rgb/name)' },
        replace: { type: 'string', description: 'Color to replace with (hex/rgb/name)' },
        palette: {
          type: 'array',
          items: { type: 'string' },
          description: 'Target color palette to map into'
        },
        svgString: { type: 'string', description: 'Input SVG XML markup' },
        target: { type: 'string', enum: ['canvas', 'svg'] }
      }
    }
  },
  {
    name: 'geovanta_svg_parse',
    description: 'Parse an SVG XML string into the structured Geovanta document JSON format.',
    inputSchema: {
      type: 'object',
      properties: {
        svgString: { type: 'string', description: 'Raw SVG XML string to parse' }
      },
      required: ['svgString']
    }
  },
  {
    name: 'geovanta_svg_serialize',
    description: 'Serialize a Geovanta document JSON structure into clean, valid SVG XML markup.',
    inputSchema: {
      type: 'object',
      properties: {
        doc: { type: 'object', description: 'Geovanta document object ({ id, artboard, objects })' }
      },
      required: ['doc']
    }
  },
  {
    name: 'geovanta_live_get_canvas',
    description:
      'Retrieve the active screen (workspace or editor), list of workspace projects, active canvas state, artboard dimensions, layers, and selection from the connected live Geovanta application.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'geovanta_live_mutate_canvas',
    description:
      'Mutate active canvas objects with transactional Undo/Redo tracking in the connected Geovanta application.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: "Human-readable description for undo history (e.g. 'Add Star Shape')"
        },
        objects: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of Geovanta vector objects to add or update'
        },
        replaceAll: {
          type: 'boolean',
          description: 'If true, clears existing objects and replaces document objects'
        }
      },
      required: ['action', 'objects']
    }
  },
  {
    name: 'geovanta_live_select_objects',
    description: 'Select or focus specific vector objects by ID on the active Geovanta canvas.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' }, description: 'Array of object IDs to select' }
      },
      required: ['ids']
    }
  },
  {
    name: 'geovanta_live_export',
    description: 'Trigger file export of active Geovanta canvas in specified format (svg, png, jpg, webp).',
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['svg', 'png', 'jpg', 'webp'], description: 'Export file format' }
      }
    }
  }
];

module.exports = {
  TOOL_DEFINITIONS
};
