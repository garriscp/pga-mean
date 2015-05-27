var app = angular.module('pgaMean', []);

app.factory('mainFactory', ["$http", function($http){

    return {
        getData: function() {
            return $http.get('/test');
        },
        getFlightData: function() {
            return $http.get('/flight')
        },
        getNameFromId: function(id) {
            return $http.get('/players/' + id);
        }
    }

}]);

app.controller('mainController', function($scope,mainFactory) {

   $scope.teams = [];
   $scope.flights = [];
   $scope.sortedFlights = [];

   mainFactory.getData().then(function(data){
       $scope.teams = data.data;
   });

    mainFactory.getFlightData().then(function(data){
        $scope.sortedFlights = data.data;
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