var app = angular.module('admin', [],function($locationProvider){
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
});

app.controller('adminController', function($scope,mainFactory) {

    $scope.numberOfTeamsOptions = [4,5];
    $scope.numberOfRoundsOptions = [5,6];

    $scope.tournamentID = 0;
    $scope.tournamentName = "";
    $scope.trashAlley = [];
    $scope.numberOfTeams = 4;
    $scope.numberOfRounds = 5;
    $scope.players = [];
    $scope.users = [];
    $scope.teams = [
        {
            "user_id": "0",
            "players": [""," "," "," "," "]
        },
        {
            "user_id": "1",
            "players": [" "," "," "," "," "]
        },
        {
            "user_id": "2",
            "players": [" "," "," "," "," "]
        },
        {
            "user_id": "3",
            "players": [" "," "," "," "," "]
        }
    ];

    mainFactory.getAllPlayers().then(function(data){
        $scope.players = data.data;
    }, function(data){
        console.log("error getting players --> " + data);
    });

    mainFactory.getAllUsers().then(function(data){
        $scope.users = data.data;
    }, function(data){
        console.log("error getting users --> " + data);
    });

    $scope.getNumber = function(num) {
        return new Array(num);
    };



    $scope.buildField = function(){
        mainFactory.buildField($scope.tournamentID).then(function(data){
            $(".results").html("Field Successfully Updated --> " + JSON.stringify(data.data));
        },function(data){
            $(".results").html("There was an error --> " + JSON.stringify(data.data));
        });
    };

    $scope.getTrashHoles = function() {
        var checkboxArray = [];
        var checkboxes = $(".checkbox-container input:checked");
        checkboxes.each(function(){
            checkboxArray.push(parseInt(this.value,10));
        });
        return checkboxArray;
    };

    function checkNoEmpties(array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i] === "") return false
        }
        return true
    }

    function checkTeamsForEmptyPlayers() {
        var emptyFlag = false;
        for (var i = 0; i < $scope.teams.length; i++) {
            if (checkNoEmpties($scope.teams[i].players)) {
                //nothing
            } else {
                emptyFlag = true;
            }
        }
        return emptyFlag;
    }


    $scope.createTournament = function(){

        var tournamentJSON = {
            "name": $scope.tournamentName,
            "eaglePrice": 2,
            "trashHoles": $scope.getTrashHoles(),
            "trashPrice": 1,
            "flightPayouts": [10,5,0,-5,-10],
            "parOrWorsePayouts": [0,0,0,-2,-3,-4,-5,-6,-7,-8,-9,-10],
            "parOrWorsePayoutsAnti": [0,0,1,2,3,4,5,6,7,8,9,10],
            "tournamentCode": $scope.tournamentID,
            "teams": $scope.teams
        };

        if (checkTeamsForEmptyPlayers(tournamentJSON.teams)) {
            alert("you have some empty players - please check");
        } else {
            mainFactory.createTournament(tournamentJSON).then(function(data){
                $(".tournament-results").html("Tournament Successfully Added --> " + JSON.stringify(data.data));
            },function(data){
                $(".tournament-results").html("There was an error --> " + JSON.stringify(data.data));
            })
        }
    };

    $scope.deleteTournament = function(id) {
        mainFactory.deleteTournament(id).then(function(data){
            $(".tournament-results").html("Tournament Successfully Deleted --> " + JSON.stringify(data.data));
        },function(data){
            $(".tournament-results").html("There was an error --> " + JSON.stringify(data.data));
        })
    };

    mainFactory.getTournaments().then(function(tournaments){
        $scope.tournaments = tournaments.data;
    })
});


app.factory('mainFactory', ["$http", function($http){

    return {
        buildField: function(tournament_id) {
            return $http.get('/build/' + tournament_id);
        },
        getAllPlayers: function() {
            return $http.get('/players');
        },
        getAllUsers: function() {
            return $http.get('/users');
        },
        createTournament: function(tournamentData) {
            return $http.post('/tournament', tournamentData);
        },
        getTournaments: function() {
            return $http.get('/tournaments');
        },
        deleteTournament: function(tournament_id) {
            return $http.delete('/tournaments/' + tournament_id)
        }
    }

}]);