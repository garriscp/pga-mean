var app = angular.module('pgaMean', ['ui.router'],function($locationProvider){
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
});

app.config(function($stateProvider, $urlRouterProvider) {
    //
    // Now set up the states
    $stateProvider
        .state('home', {
            url: "/",
            templateUrl: "/views/home.html"
        })
        .state('tournament', {
            url: "/tournament/:tournament_id",
            templateUrl: "/views/tournament.html",
            controller: "tournamentController"
        })
        .state('all-tournaments', {
            url: "/all-tournaments",
            templateUrl: "/views/all-tournaments.html"
        })
});

app.factory('mainFactory', ["$http", function($http){

    return {
        getTeams: function(tournament_id) {
            return $http.get('/team/' + tournament_id);
        },
        getFlightData: function(tournament_id) {
            return $http.get('/flight/' + tournament_id);
        },
        getTournament: function(tournament_id) {
            return $http.get('/tournaments/' + tournament_id);
        },
        getNames: function() {
            return $http.get('/users');
        },
        getTournaments: function() {
            return $http.get('/tournaments');
        },
        getMostRecentTournament: function() {
            return $http.get('/tournaments/mostRecent')
        }
    }

}]);

app.controller('mainController', function($stateParams, $scope, mainFactory) {
    var tournament_id = $stateParams.tournament_id;
    mainFactory.getTournaments(tournament_id).then(function(tournaments){
        $scope.tournaments = tournaments.data;
    });
    mainFactory.getMostRecentTournament(tournament_id).then(function(tournament){
        $scope.mostRecent = tournament.data;
    });

    $scope.closeMenu = function() {
        $('.navbar-toggle:visible').click();
    };

});

app.controller('tournamentController', function($scope,mainFactory,$location,$q,$stateParams, $state) {
    var tournament_id = $stateParams.tournament_id;

    $scope.state = $state.current;
    $scope.params = $stateParams;

    $scope.teams = [];
    $scope.sortedFlights = [];
    $scope.namesData = [];
    $scope.tournament = {};

    $scope.selected = {};

    var getTeams = mainFactory.getTeams(tournament_id);
    var getFlights = mainFactory.getFlightData(tournament_id);
    mainFactory.getTournament(tournament_id).then(function(tournament){
        $scope.tournament = tournament.data;
    });

    showLoading();

    $q.all([getTeams,getFlights]).then(function(data){
        hideLoading();
        $scope.teams = data[0].data;
        $scope.sortedFlights = data[1].data;
    }, function(data){
        //error
        hideLoading();
        console.log(data);
    });

    mainFactory.getNames().then(function(data){
        $scope.namesData = _.sortBy( data.data, "id");
    });

    function showLoading() {
        $(".loading").show();
    }

    function hideLoading() {
        $(".loading").hide();
    }

    $scope.toggleActive = function(player) {
        $scope.selected = ($scope.selected === player) ? {} : player;
    };

    $scope.isSelected = function(player) {
        return $scope.selected === player;
    };

    $scope.getDayFromRound = function(round) {
        var days = ["THU","FRI","SAT","SUN"];
        return (round > 3) ? "XTRA" : days[round];
    };

    $scope.truncateName = function(name) {
        return name.substring(0,name.indexOf(","));
    }

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