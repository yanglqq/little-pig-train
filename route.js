var i_stop__no = 0
var i_stop__station = 1
var i_stop__day = 2
var i_stop__arrival_time = 3
var i_stop__departure_time = 4
var i_stop__rest_time = 5
var i_stop__mileage = 6

var stop_items_count = 7

//--------------------------------------------

var i_station__name = 0
var i_station__pinyin = 1
var i_station__pinyin_short = 2
var i_station__code = 3
var i_station__city = 4
var i_station__brothers = 5
var i_station__trains = 6

//--------------------------------------------

var i_city__name = 0
var i_city__pinyin = 1
var i_city__pinyin_short = 2
var i_city__stations = 3

//--------------------------------------------

var price_index_def = {
    "A1": 0, //"硬座",
    "A2": 1, //"软座",
    "A3": 2, //"硬卧",
    "A4": 3, //"软卧",
    "A6": 4, //"高级软卧",
    "O":  5, //"二等座",
    "M":  6, //"一等座",
    "A9": 7, //"商务座",
    "P":  8  //"特等座"
}
//--------------------------------------------

var station_sufix = ["东","西","南","北"];
function getStation(stationName){
	var station = station_map[stationName];
	if(!station){
    	for(var i = 0; i < station_sufix.length; i++){
    		station = station_map[stationName + station_sufix[i]];
    		if(station) break;
    	}
    }
	return station;
}

//最大换乘次数
var n_transferTrains = 1;
function findRoute(fromStation, toStation){
	from = getStation(fromStation);
	if(!from){
		throw new Error("起始站不存在：" + fromStation);
	}
	to = getStation(toStation);
	if(!to){
		throw new Error("到达站不存在：" + toStation);
	}
	var routeStack = [];
	var routes = [];
	var route = [];
	function getAvailableTrains(station, sole){
		var availableTrains = [];
		function addTrains(station){
			var trains = station_list[station][i_station__trains];
			for(var i = 0; i < trains.length; i++){
				availableTrains.push({station: station, train: trains[i]});
			}
		}
		addTrains(station);
		if(!sole){
			var others = station_list[station][i_station__brothers];
			if(others){
				for(var i = 0; i < others.length; i++){
					addTrains([others[i]]);
				}
			}
		}
		return availableTrains;
	}
	function addTrain(route, trainNumber, start, end){
			return route.concat([{train: trainNumber, start: start, end: end}]);
	}
	function isDestination(to, station){
		if(to == station) return true;
		var theStations = city_list[station_list[to][i_station__city]][i_city__stations];
		if(theStations){
			var brothers = station_list[station][i_station__brothers];
			if(brothers){
				for(var i = 0; i < brothers.length; i++){
					if(to == brothers[i]) return true;
				}
			}
		}
		return false;
	}
	var theStations = city_list[station_list[from][i_station__city]][i_city__stations];
	if(!theStations){
		theStations = [from];
	}
	for(var x = 0; x < theStations.length; x++){
		routeStack.push({station: theStations[x], availableTrains: getAvailableTrains(theStations[x], true), i: 0, route: []});
	}
	while(routeStack.length > 0){
		var candidate = routeStack[0];
		if(candidate.i == candidate.availableTrains.length){
			routeStack.shift();
			continue;
		}
		var trainNumber = candidate.availableTrains[candidate.i].train;
		var thisStation = candidate.availableTrains[candidate.i].station;
		candidate.i++;
		//不能再坐路径中的上一次火车
		if(candidate.route.length > 0 && candidate.route[candidate.route.length - 1].train == trainNumber){
			continue;
		}
		var train = trains[trainNumber];
		//查找当前车站在这列火车所停靠站中的位置
		var j = 0;
		for(; j < train.stops.length; j++){
			if(thisStation == train.stops[j][i_stop__station]){
				break;
			}
		}
		var prefix = trainNumber.charAt(0);
		var k = j + 1;
		 //直达车只能在终点站换乘
		if(prefix == "Z"){
			if(j > 0) continue;
			k = train.stops.length - 1;
		}
		//如果换乘次数达到最大换乘次数，在找到目的地后， 要终止循环
		var state = candidate.route.length == n_transferTrains ? 1 : 0;
		for(; k < train.stops.length; k++){
			var station = train.stops[k][i_stop__station];
			if(isDestination(to, station)){
				//这列火车开往目的地
				routes.push(addTrain(candidate.route, trainNumber, j, k));
				if(++state == 2) break;
			}
			if(state == 1) continue;
			//路径中不能有环
			var isStationVisited = false;
			for(var m = 0; m < candidate.route.length; m++){
				var routei = candidate.route[m];
				var takedTrain = trains[routei.train];
				var n = routei.start;
				for(; n <= routei.end; n++){
					if(station == takedTrain.stops[n][i_stop__station]) break;
				}
				if(n <= routei.end){
					isStationVisited = true;
					break;
				}
			}
			if(isStationVisited) break;
			routeStack.push({station: station, availableTrains: getAvailableTrains(station), i: 0, route: addTrain(candidate.route, trainNumber, j, k)});
		}
	}
	return routes;
}

function _findTrain(routes, trainNumber){
	if(trainNumber) trainNumber = trainNumber.toUpperCase();
	var train = trains[trainNumber];
	if(!train) throw new Error("列车不存在: " + trainNumber);
	routes.push([{train: trainNumber, start: 0, end: train.stops.length - 1}]);
}

function findTrain(trainNumber){
	var routes = [];
	_findTrain(routes, trainNumber);
	return routes;
}

function findPassedTrains(s){
	var station = getStation(s);
	if(!station) throw new Error("车站不存在: " + s);
	var theStations = city_list[station_list[station][i_station__city]][i_city__stations];
	if(!theStations){
		theStations = [station];
	}
	var routes = [];
	for(var x = 0; x < theStations.length; x++){
    	var passed = station_list[theStations[x]][i_station__trains];
    	if(passed){
    		for(var i = 0; i < passed.length; i++){
    			_findTrain(routes, passed[i]);
    		}
    	}
	}
	
	return routes;
}

function calculatePrices(trainNumber, train, start, end){
	var price_table = train.priceTable
    var price_indices_table = train.priceIndicesTable
	var prices = [];
	var zero_price_array = []
	for(var i = 0; i < price_table[0].length; i++){
		zero_price_array.push(0.0)
	}
	prices.push(zero_price_array)
	for(var i = start + 1; i <= end; i++){
		prices.push(price_table[price_indices_table[start] + i - start - 1])
	}
	return prices;
}

function calculateCost(routes){
	for(var i = 0; i < routes.length; i++){
		var route = routes[i];
		route.mileage = 0;
		route.travelCost = 0;
		route.transferCost = 0;
		route.totalCost = 0;
		route.feeCost = 0;
		for(var j = 0; j < route.length; j++){
			var routei = route[j];
			var train = trains[routei.train];
			var from = train.stops[routei.start];
			var to = train.stops[routei.end];
			routei.travelCost = timeDifference(to[i_stop__day], to[i_stop__arrival_time], from[i_stop__day], from[i_stop__departure_time]);
			routei.mileage = to[i_stop__mileage] - from[i_stop__mileage];
			routei.prices = calculatePrices(routei.train, train, routei.start, routei.end);
			route.travelCost += routei.travelCost;
			route.mileage += routei.mileage;
			route.totalCost += routei.travelCost;
			route.feeCost += (routei.feeCost = Math.min.apply(Math, routei.prices[routei.prices.length - 1]));
			route["departureTime" + j] = time2minute(train.stops[routei.start][i_stop__departure_time]);
			route["arrivalTime" + j] = time2minute(train.stops[routei.end][i_stop__arrival_time]);
			if(j > 0){
				var lastArrivalTime = time2minute(trains[route[j - 1].train].stops[route[j - 1].end][i_stop__arrival_time]);
				var nextDepartureTime = time2minute(from[i_stop__departure_time]);
				routei.transferAcrossDay = nextDepartureTime <= lastArrivalTime;
				routei.transferCost = nextDepartureTime - lastArrivalTime + (routei.transferAcrossDay ? 1440 : 0);
				route.transferCost += routei.transferCost;
				route.totalCost += routei.transferCost;
			}
		}
	}
}

function createRoutesForDisplay(routes, count){
	var topTenRoutes = [];
	if(count > routes.length) count = routes.length;
	for(var i = 0; i < count; i++){
		var route = routes[i];
		var routeInfo = {
			mileage: route.mileage,
			travelCost: time2zh(route.travelCost),
			transferCost: time2zh(route.transferCost),
			totalCost: time2zh(route.totalCost),
			feeCost: "¥" + route.feeCost,
			trains: [],
			time: []
		};
		var iday = 0;
		var imileage = 0
		for(var j = 0; j < route.length; j++){
			var routei = route[j];
			var train = trains[routei.train];
			var trainInfo = {
					train: routei.train,
					trainType: train.trainType,
					startStation: station_list[train.departureStation][i_station__name],
					endStation: station_list[train.arrivalStation][i_station__name],
					fromStation: station_list[train.stops[routei.start][i_stop__station]][i_station__name],
					toStation: station_list[train.stops[routei.end][i_stop__station]][i_station__name],
					travelCost: time2zh(routei.travelCost),
					transferCost: routei.transferCost ? time2zh(routei.transferCost) : undefined,
					feeCost: "¥" + routei.feeCost,
					mileage: routei.mileage,
					stops: []
			};
			var priceTypeTable = train.priceTypeTable
			var price_indices = new Array(priceTypeTable.length)
			for(var pi = 0; pi < priceTypeTable.length; pi++){
				price_indices[pi] = price_index_def[priceTypeTable[pi]];
			}
			
			var df = 0, thisday = 0;
			if(routei.transferAcrossDay) iday++;
			for(var k = routei.start; k <= routei.end; k++){
				var stop = train.stops[k];
				if(k == routei.start)	df = stop[i_stop__day];
				thisday = iday + stop[i_stop__day] - df;
				if(k > routei.start) imileage += train.stops[k][i_stop__mileage] - train.stops[k - 1][i_stop__mileage];
				var stopInfo = {
					number: k + 1,
					day: thisday + 1,
					station: station_list[stop[i_stop__station]][i_station__name],
					arrivalTime: stop[i_stop__arrival_time],
					departureTime: stop[i_stop__departure_time],
					stopCost: stop[i_stop__rest_time],
					mileage: imileage
				};
				var prices_display = ["-","-","-","-","-","-","-","-","-"]
				var prices = routei.prices[k - routei.start]
				if(prices){
    				for(var pi = 0; pi < prices.length; pi++){
    					var value = prices[pi]
    					if(value)
    						prices_display[price_indices[pi]] = value
    				}
				}
				stopInfo.prices = prices_display;
				if(stopInfo.stopCost != "-") stopInfo.stopCost;
				trainInfo.stops.push(stopInfo);
			}
			iday = thisday;
			var timeInfo = {
				departureTime: train.stops[routei.start][i_stop__departure_time],
				arrivalTime: train.stops[routei.end][i_stop__arrival_time],
				transferCost: trainInfo.transferCost
			};
			routeInfo.trains.push(trainInfo);
			routeInfo.time.push(timeInfo);
		}
		topTenRoutes.push(routeInfo);
	}
	return topTenRoutes;
}