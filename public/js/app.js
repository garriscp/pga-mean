var app = angular.module('pgaMean', []);

app.factory('mainFactory', ["$http", function($http){

    return {
        getData: function() {
            return $http.get('/test');
        },
        getFlightData: function() {
            return $http.get('/flight')
        },
        getNames: function() {
            return $http.get('/users');
        },
        getNameById: function(id) {
            return $http.get('/users/' + id);
        }
    }

}]);

app.controller('mainController', function($scope,mainFactory) {

    $scope.teams = [];
    $scope.sortedFlights = [];
    $scope.namesData = [];

    mainFactory.getData().then(function(data){
       $scope.teams = data.data;
    });

    mainFactory.getFlightData().then(function(data){
        $scope.sortedFlights = data.data;
    });

    mainFactory.getNames().then(function(data){
        $scope.namesData = _.sortBy( data.data, "id");
        console.log($scope.namesData);
    });

});

app.directive("players", function() {
    return {
        link: function (scope, element) {
            scope.$watch("teams",function(teams){
                if (teams.length) {
                    var html = "";
                    var teamMoney = 0;
                    var totalMoney = 0;
                    var teamsMoney = [];
                    angular.forEach(teams, function (team, index) {
                        teamMoney = 0;
                        angular.forEach(team, function (player, index) {
                            teamMoney += Number(player.money);
                        });
                        //multiple your team money by number of teams that owe you
                        teamMoney *= teams.length;
                        teamsMoney.push(teamMoney);
                        totalMoney += teamMoney;
                    });
                    //this is how we zero it out
                    //get avg of the money earned
                    //then subtract avg from each team's money
                    var avg = totalMoney / teams.length;
                    angular.forEach(teamsMoney, function (money,index) {
                        teamsMoney[index] = money - avg;
                        html += '<td>' + teamsMoney[index] + '</td>';
                    });
                    replaceMoney(html);
                }
            });

            function replaceMoney(html) {
                element.replaceWith(html);
            }
        }
    }
});

app.directive("flights", function() {
    return {
        link: function (scope, element) {
            scope.$watch("sortedFlights",function(flights){
                if (flights.length) {
                    var html = "";
                    var teamsMoney = [];
                    //set each teams money to 0
                    angular.forEach(scope.teams, function(team, index){
                        teamsMoney[index] = 0;
                    });
                    angular.forEach(flights, function (flight, index) {
                        angular.forEach(flight, function (player, index) {
                            teamsMoney[player.userId] += Number(player.money);
                        });
                    });
                    angular.forEach(teamsMoney, function (money,index) {
                        html += '<td>' + teamsMoney[index] + '</td>';
                    });
                    replaceMoney(html);
                }
            });

            function replaceMoney(html) {
                element.replaceWith(html);
            }
        }
    }
});


app.directive("users", function() {
    return {
        link: function (scope, element) {
            scope.$watch("namesData",function(users){
                if (users.length) {
                    var html = "";
                    angular.forEach(users, function (user,index) {
                        html += '<td>' + user.name + '</td>';
                    });
                    replaceMoney(html);
                }
            });

            function replaceMoney(html) {
                element.replaceWith(html);
            }
        }
    }
});