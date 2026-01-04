// Map Generation
// Creates 3-lane, 10-floor procedural map with node types

// Node types
const NodeTypes = {
    FIGHT: 'fight',
    EVENT: 'event',
    SHOP: 'shop',
    REST: 'rest',
    BOSS: 'boss',
    START: 'start'
};

// Node type probabilities (for non-boss floors)
const NODE_PROBABILITIES = {
    fight: 0.60,
    event: 0.15,
    shop: 0.10,
    rest: 0.15
};

// Map node class
class MapNode {
    constructor(floor, lane, type) {
        this.floor = floor;
        this.lane = lane;
        this.type = type;
        this.visited = false;
        this.available = false;
        this.connections = []; // Lanes this node connects to on next floor
    }

    getIcon() {
        switch (this.type) {
            case NodeTypes.FIGHT: return '⚔️';
            case NodeTypes.EVENT: return '❓';
            case NodeTypes.SHOP: return '🏪';
            case NodeTypes.REST: return '🔥';
            case NodeTypes.BOSS: return '👑';
            case NodeTypes.START: return '🏠';
            default: return '⚫';
        }
    }

    getLabel() {
        switch (this.type) {
            case NodeTypes.FIGHT: return 'Fight';
            case NodeTypes.EVENT: return 'Event';
            case NodeTypes.SHOP: return 'Shop';
            case NodeTypes.REST: return 'Rest';
            case NodeTypes.BOSS: return 'Boss';
            case NodeTypes.START: return 'Start';
            default: return '';
        }
    }

    getColor() {
        switch (this.type) {
            case NodeTypes.FIGHT: return 'danger';
            case NodeTypes.EVENT: return 'warning';
            case NodeTypes.SHOP: return 'accent';
            case NodeTypes.REST: return 'success';
            case NodeTypes.BOSS: return 'primary';
            default: return 'border';
        }
    }
}

// Map Generator
class MapGenerator {
    constructor(seed) {
        this.seed = seed;
        this.floors = 10;
        this.lanes = 3;
        this.map = [];
    }

    // Generate the entire map
    generate() {
        const rng = getRNG();
        this.map = [];

        // Generate each floor (0-indexed array, but floor number 1-10)
        for (let floorIndex = 0; floorIndex < this.floors; floorIndex++) {
            const floorNodes = [];
            const floorNumber = floorIndex + 1; // Display floor number (1-10)

            for (let lane = 0; lane < this.lanes; lane++) {
                let nodeType;

                // Floors 5 and 10 are boss floors
                if (floorNumber === 5 || floorNumber === 10) {
                    nodeType = NodeTypes.BOSS;
                }
                // Other floors - use probabilities
                else {
                    nodeType = this.selectNodeType(rng);
                }

                const node = new MapNode(floorIndex, lane, nodeType);
                floorNodes.push(node);
            }

            this.map.push(floorNodes);
        }

        // Generate connections between floors
        this.generateConnections();

        // Set initial availability (floor 0 = first floor, all nodes available)
        if (this.map.length > 0) {
            for (const node of this.map[0]) {
                node.available = true;
            }
        }

        return this.map;
    }

    // Select node type based on probabilities
    selectNodeType(rng) {
        const roll = rng.random();
        let cumulative = 0;

        for (const [type, prob] of Object.entries(NODE_PROBABILITIES)) {
            cumulative += prob;
            if (roll < cumulative) {
                return type;
            }
        }

        return NodeTypes.FIGHT; // Fallback
    }

    // Generate connections between floors
    generateConnections() {
        const rng = getRNG();

        for (let floor = 0; floor < this.map.length - 1; floor++) {
            const currentFloor = this.map[floor];

            for (let lane = 0; lane < currentFloor.length; lane++) {
                const node = currentFloor[lane];
                
                // Each node can connect to 1-3 adjacent lanes on next floor
                const possibleConnections = [];
                
                // Can always connect to same lane
                possibleConnections.push(lane);
                
                // Can connect to adjacent lanes
                if (lane > 0) possibleConnections.push(lane - 1);
                if (lane < this.lanes - 1) possibleConnections.push(lane + 1);

                // Always connect to at least same lane, then randomly add 0-2 more
                node.connections = [lane]; // Guarantee same lane connection
                
                // Add additional connections
                const otherConnections = possibleConnections.filter(l => l !== lane);
                if (otherConnections.length > 0 && rng.chance(0.7)) {
                    const numExtra = rng.randomInt(1, otherConnections.length);
                    const extraConns = rng.sample(otherConnections, numExtra);
                    node.connections = [...node.connections, ...extraConns];
                }
            }
        }
    }

    // Get node at specific position
    getNode(floor, lane) {
        if (floor < 0 || floor >= this.map.length) return null;
        if (lane < 0 || lane >= this.lanes) return null;
        return this.map[floor][lane];
    }

    // Get available nodes (nodes connected to visited nodes)
    getAvailableNodes() {
        const available = [];
        
        for (const floorNodes of this.map) {
            for (const node of floorNodes) {
                if (node.available && !node.visited) {
                    available.push(node);
                }
            }
        }
        
        return available;
    }

    // Visit a node and update availability
    visitNode(floor, lane) {
        const node = this.getNode(floor, lane);
        if (!node || node.visited) return false;

        node.visited = true;
        // Don't set available = false, so other nodes in same floor stay clickable

        // Make connected nodes on next floor available
        if (floor < this.map.length - 1) {
            const nextFloor = this.map[floor + 1];
            for (const connectedLane of node.connections) {
                if (nextFloor[connectedLane]) {
                    nextFloor[connectedLane].available = true;
                }
            }
        }

        return true;
    }

    // Get current floor number (highest visited floor)
    getCurrentFloor() {
        let currentFloor = 0;
        
        for (let floor = 0; floor < this.map.length; floor++) {
            const hasVisited = this.map[floor].some(node => node.visited);
            if (hasVisited) {
                currentFloor = floor + 1;
            }
        }
        
        return currentFloor;
    }

    // Check if map is complete (all floors visited)
    isComplete() {
        if (this.map.length === 0) return false;
        const lastFloor = this.map[this.map.length - 1];
        return lastFloor.some(node => node.visited);
    }

    // Serialize map for saving
    serialize() {
        return {
            seed: this.seed,
            floors: this.floors,
            lanes: this.lanes,
            nodes: this.map.map(floor => 
                floor.map(node => ({
                    floor: node.floor,
                    lane: node.lane,
                    type: node.type,
                    visited: node.visited,
                    available: node.available,
                    connections: node.connections
                }))
            )
        };
    }

    // Deserialize map from save
    static deserialize(data) {
        const generator = new MapGenerator(data.seed);
        generator.floors = data.floors;
        generator.lanes = data.lanes;
        generator.map = data.nodes.map(floor =>
            floor.map(nodeData => {
                const node = new MapNode(nodeData.floor, nodeData.lane, nodeData.type);
                node.visited = nodeData.visited;
                node.available = nodeData.available;
                node.connections = nodeData.connections;
                return node;
            })
        );
        return generator;
    }
}

// Global map generator
let mapGenerator = null;

function initMap(seed) {
    mapGenerator = new MapGenerator(seed);
    return mapGenerator.generate();
}

function getMap() {
    return mapGenerator;
}

