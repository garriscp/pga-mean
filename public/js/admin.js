var app = angular.module('admin', [],function($locationProvider){
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
});

app.controller('adminController', function($scope,mainFactory) {

    $scope.tournamentID = 0;
    $scope.players = [];

    $scope.buildField = function(){
        mainFactory.buildField($scope.tournamentID).then(function(data){
            $(".results").html("Field Successfully Updated --> " + JSON.stringify(data.data));
        },function(data){
            $(".results").html("There was an error --> " + JSON.stringify(data.data));
        });
    };

    mainFactory.getAllPlayers().then(function(data){
        $scope.players = data.data;
    }, function(data){
        console.log("error getting players --> " + data);
    })

});


app.factory('mainFactory', ["$http", function($http){

    return {
        buildField: function(tournament_id) {
            return $http.get('/build/' + tournament_id);
        },
        getAllPlayers: function() {
            return $http.get('/players');
        }
    }

}]);