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

    $scope.loading = false;

    var getTeams = mainFactory.getTeams(tournament_id);
    mainFactory.getTournament(tournament_id).then(function(tournament){
        $scope.tournament = tournament.data;
    });

    $scope.loading = true;

    $q.all([getTeams]).then(function(data){
        $scope.loading = false;
        $scope.teams = data[0].data;
    }, function(data){
        //error
        $scope.loading = false;
        console.log(data);
    });

    mainFactory.getNames().then(function(data){
        $scope.namesData = _.sortBy( data.data, "id");
    });

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