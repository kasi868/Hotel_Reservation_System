class HotelReservationSystem {
    constructor() {
        this.rooms = this.initializeRooms();
        this.occupiedRooms = new Set();
        this.selectedRooms = new Set();
        this.init();
    }

    initializeRooms() {
        const rooms = {};
        
        // Floors 1-9: 10 rooms each (101-110, 201-210, etc.)
        for (let floor = 1; floor <= 9; floor++) {
            for (let room = 1; room <= 10; room++) {
                const roomNumber = floor * 100 + room;
                rooms[roomNumber] = {
                    floor: floor,
                    position: room,
                    occupied: false
                };
            }
        }
        
        // Floor 10: 7 rooms (1001-1007)
        for (let room = 1; room <= 7; room++) {
            const roomNumber = 1000 + room;
            rooms[roomNumber] = {
                floor: 10,
                position: room,
                occupied: false
            };
        }
        
        return rooms;
    }

    init() {
        this.renderHotel();
        this.bindEvents();
        this.updateStats();
    }

    bindEvents() {
        document.getElementById('bookRooms').addEventListener('click', () => {
            const roomCount = parseInt(document.getElementById('roomCount').value);
            this.bookRooms(roomCount);
        });

        document.getElementById('generateRandom').addEventListener('click', () => {
            this.generateRandomOccupancy();
        });

        document.getElementById('resetBooking').addEventListener('click', () => {
            this.resetAllBookings();
        });
    }

    renderHotel() {
        const floorsContainer = document.getElementById('floors');
        floorsContainer.innerHTML = '';

        // Render floors 10 to 1 (top to bottom)
        for (let floor = 10; floor >= 1; floor--) {
            const floorDiv = document.createElement('div');
            floorDiv.className = 'floor';
            
            const floorLabel = document.createElement('div');
            floorLabel.className = 'floor-label';
            floorLabel.textContent = `Floor ${floor}`;
            
            const roomsDiv = document.createElement('div');
            roomsDiv.className = 'rooms';
            
            // Get rooms for this floor
            const floorRooms = Object.keys(this.rooms)
                .filter(roomNum => this.rooms[roomNum].floor === floor)
                .sort((a, b) => parseInt(a) - parseInt(b));
            
            floorRooms.forEach(roomNum => {
                const roomDiv = document.createElement('div');
                roomDiv.className = 'room';
                roomDiv.textContent = roomNum;
                roomDiv.dataset.roomNumber = roomNum;
                
                if (this.selectedRooms.has(parseInt(roomNum))) {
                    roomDiv.classList.add('selected');
                } else if (this.rooms[roomNum].occupied) {
                    roomDiv.classList.add('occupied');
                } else {
                    roomDiv.classList.add('available');
                }
                
                roomsDiv.appendChild(roomDiv);
            });
            
            floorDiv.appendChild(floorLabel);
            floorDiv.appendChild(roomsDiv);
            floorsContainer.appendChild(floorDiv);
        }
    }

    calculateTravelTime(room1, room2) {
        const r1 = this.rooms[room1];
        const r2 = this.rooms[room2];
        
        // Vertical travel time (2 minutes per floor)
        const verticalTime = Math.abs(r1.floor - r2.floor) * 2;
        
        // Horizontal travel time (1 minute per room on same floor)
        const horizontalTime = r1.floor === r2.floor ? Math.abs(r1.position - r2.position) : 0;
        
        return verticalTime + horizontalTime;
    }

    calculateTotalTravelTime(roomNumbers) {
        if (roomNumbers.length <= 1) return 0;
        
        let totalTime = 0;
        for (let i = 0; i < roomNumbers.length - 1; i++) {
            totalTime += this.calculateTravelTime(roomNumbers[i], roomNumbers[i + 1]);
        }
        return totalTime;
    }

    getAvailableRooms() {
        return Object.keys(this.rooms)
            .map(num => parseInt(num))
            .filter(roomNum => !this.rooms[roomNum].occupied);
    }

    findOptimalRooms(requestedCount) {
        const availableRooms = this.getAvailableRooms();
        
        if (availableRooms.length < requestedCount) {
            return null; // Not enough rooms available
        }

        // Group available rooms by floor
        const roomsByFloor = {};
        availableRooms.forEach(roomNum => {
            const floor = this.rooms[roomNum].floor;
            if (!roomsByFloor[floor]) {
                roomsByFloor[floor] = [];
            }
            roomsByFloor[floor].push(roomNum);
        });

        // Sort rooms on each floor by position
        Object.keys(roomsByFloor).forEach(floor => {
            roomsByFloor[floor].sort((a, b) => 
                this.rooms[a].position - this.rooms[b].position
            );
        });

        // Try to book all rooms on the same floor first
        for (const floor in roomsByFloor) {
            if (roomsByFloor[floor].length >= requestedCount) {
                return roomsByFloor[floor].slice(0, requestedCount);
            }
        }

        // If not possible on same floor, find optimal combination across floors
        return this.findOptimalCrossFloorCombination(availableRooms, requestedCount);
    }

    findOptimalCrossFloorCombination(availableRooms, requestedCount) {
        let bestCombination = null;
        let minTravelTime = Infinity;

        // Generate all possible combinations of the requested count
        const combinations = this.getCombinations(availableRooms, requestedCount);
        
        for (const combination of combinations) {
            const sortedCombination = combination.sort((a, b) => {
                const floorDiff = this.rooms[a].floor - this.rooms[b].floor;
                if (floorDiff !== 0) return floorDiff;
                return this.rooms[a].position - this.rooms[b].position;
            });
            
            const travelTime = this.calculateTotalTravelTime(sortedCombination);
            
            if (travelTime < minTravelTime) {
                minTravelTime = travelTime;
                bestCombination = sortedCombination;
            }
        }

        return bestCombination;
    }

    getCombinations(arr, k) {
        if (k === 1) return arr.map(x => [x]);
        if (k === arr.length) return [arr];
        if (k > arr.length) return [];

        const combinations = [];
        
        // Use a more efficient approach for larger arrays
        if (arr.length > 20) {
            // For larger arrays, use a heuristic approach
            return this.getHeuristicCombinations(arr, k);
        }

        // For smaller arrays, use complete enumeration
        const helper = (start, current) => {
            if (current.length === k) {
                combinations.push([...current]);
                return;
            }
            
            for (let i = start; i < arr.length; i++) {
                current.push(arr[i]);
                helper(i + 1, current);
                current.pop();
            }
        };

        helper(0, []);
        return combinations;
    }

    getHeuristicCombinations(availableRooms, requestedCount) {
        // Group rooms by floor and prioritize adjacent rooms
        const roomsByFloor = {};
        availableRooms.forEach(roomNum => {
            const floor = this.rooms[roomNum].floor;
            if (!roomsByFloor[floor]) {
                roomsByFloor[floor] = [];
            }
            roomsByFloor[floor].push(roomNum);
        });

        // Sort rooms on each floor by position
        Object.keys(roomsByFloor).forEach(floor => {
            roomsByFloor[floor].sort((a, b) => 
                this.rooms[a].position - this.rooms[b].position
            );
        });

        const combinations = [];
        
        // Generate combinations prioritizing same floor and adjacent rooms
        const floors = Object.keys(roomsByFloor).map(f => parseInt(f)).sort((a, b) => a - b);
        
        for (let i = 0; i < floors.length && combinations.length < 1000; i++) {
            const floor = floors[i];
            const floorRooms = roomsByFloor[floor];
            
            // Try combinations starting from this floor
            this.generateFloorBasedCombinations(roomsByFloor, floor, requestedCount, combinations);
        }

        return combinations.slice(0, 100); // Limit to prevent performance issues
    }

    generateFloorBasedCombinations(roomsByFloor, startFloor, requestedCount, combinations) {
        const floors = Object.keys(roomsByFloor).map(f => parseInt(f)).sort((a, b) => Math.abs(a - startFloor) - Math.abs(b - startFloor));
        
        const helper = (floorIndex, currentRooms, remaining) => {
            if (remaining === 0) {
                combinations.push([...currentRooms]);
                return;
            }
            
            if (floorIndex >= floors.length) return;
            
            const floor = floors[floorIndex];
            const floorRooms = roomsByFloor[floor];
            
            // Try taking different numbers of rooms from this floor
            for (let take = Math.min(remaining, floorRooms.length); take >= 0; take--) {
                if (take > 0) {
                    // Take 'take' rooms from this floor (preferably adjacent)
                    for (let start = 0; start <= floorRooms.length - take; start++) {
                        const selectedFromFloor = floorRooms.slice(start, start + take);
                        helper(floorIndex + 1, [...currentRooms, ...selectedFromFloor], remaining - take);
                        
                        if (combinations.length >= 100) return; // Limit combinations
                    }
                } else {
                    // Skip this floor
                    helper(floorIndex + 1, currentRooms, remaining);
                }
            }
        };

        helper(0, [], requestedCount);
    }

    bookRooms(requestedCount) {
        // Clear previous selections
        this.selectedRooms.clear();
        
        if (requestedCount < 1 || requestedCount > 5) {
            this.showBookingResult('Please enter a number between 1 and 5.', 'error');
            return;
        }

        const optimalRooms = this.findOptimalRooms(requestedCount);
        
        if (!optimalRooms) {
            this.showBookingResult(`Sorry, only ${this.getAvailableRooms().length} rooms are available.`, 'error');
            return;
        }

        // Book the rooms
        optimalRooms.forEach(roomNum => {
            this.rooms[roomNum].occupied = true;
            this.selectedRooms.add(roomNum);
        });

        const travelTime = this.calculateTotalTravelTime(optimalRooms);
        const roomList = optimalRooms.join(', ');
        
        this.showBookingResult(
            `Successfully booked ${requestedCount} room(s): ${roomList}. Total travel time: ${travelTime} minutes.`,
            'success'
        );

        this.renderHotel();
        this.updateStats();

        // Clear selection highlight after 3 seconds
        setTimeout(() => {
            this.selectedRooms.clear();
            this.renderHotel();
        }, 3000);
    }

    showBookingResult(message, type) {
        const resultDiv = document.getElementById('bookingResult');
        resultDiv.textContent = message;
        resultDiv.className = `booking-result ${type}`;
    }

    generateRandomOccupancy() {
        // Reset all rooms first
        Object.keys(this.rooms).forEach(roomNum => {
            this.rooms[roomNum].occupied = false;
        });

        // Randomly occupy 30-60% of rooms
        const totalRooms = Object.keys(this.rooms).length;
        const occupancyRate = 0.3 + Math.random() * 0.3; // 30-60%
        const roomsToOccupy = Math.floor(totalRooms * occupancyRate);
        
        const allRooms = Object.keys(this.rooms).map(num => parseInt(num));
        const shuffled = allRooms.sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < roomsToOccupy; i++) {
            this.rooms[shuffled[i]].occupied = true;
        }

        this.selectedRooms.clear();
        this.renderHotel();
        this.updateStats();
        this.showBookingResult(`Generated random occupancy: ${roomsToOccupy} rooms occupied.`, 'success');
    }

    resetAllBookings() {
        Object.keys(this.rooms).forEach(roomNum => {
            this.rooms[roomNum].occupied = false;
        });
        
        this.selectedRooms.clear();
        this.renderHotel();
        this.updateStats();
        this.showBookingResult('All bookings have been reset.', 'success');
    }

    updateStats() {
        const totalRooms = Object.keys(this.rooms).length;
        const occupiedCount = Object.values(this.rooms).filter(room => room.occupied).length;
        const availableCount = totalRooms - occupiedCount;

        document.getElementById('availableCount').textContent = availableCount;
        document.getElementById('occupiedCount').textContent = occupiedCount;
    }
}

// Initialize the system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new HotelReservationSystem();
});