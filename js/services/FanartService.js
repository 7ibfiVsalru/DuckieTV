/**
 * Fanart API v3 service
 * docs: http://docs.fanarttv.apiary.io/#
 */
DuckieTV.factory('FanartService', ['$q', '$http', function($q, $http) {
  var endpoint = 'https://webservice.fanart.tv/v3/tv/'
  var API_KEY = 'mæ¶ën|{W´íïtßg½÷¾6mÍ9Õýß'

  function getUrl(tvdb_id) {
    return [endpoint, tvdb_id, '?api_key=', btoa(API_KEY)].join('')
  }

  function storeInDB(json, entity) {
    var art = entity || new Fanart();
    // remove unused art
    ['characterart', 'seasonbanner', 'seasonthumb', 'clearart'].map(function(item) {
      if (item in json) {
        delete json[item]
      }
    })
    art.TVDB_ID = json.thetvdb_id
    art.json = json
    art.poster = service.getTrendingPoster(json)
    art.Persist()
    return art
  }

  var service = {
    get: function(tvdb_id, refresh) {
      if (!tvdb_id) {
        console.info('Could not load fanart for null tvdb_id')
        return $q.resolve({}) // prevent http-not-found errors
      }
      refresh = refresh || false
      return CRUD.FindOne('Fanart', { TVDB_ID: tvdb_id}).then(function(entity) {
        if (entity && !refresh) {
          return entity
        } else {
          return $http.get(getUrl(tvdb_id)).then(function(result) {
            // console.debug('Refreshed fanart for tvdb_id=', tvdb_id);
            return storeInDB(result.data, entity)
          }, function(err) {
            console.error('Could not load fanart for tvdb_id=', tvdb_id, err)
            return false
          })
        }
      }, function(err) {
        console.error('Could not load fanart for tvdb_id=', tvdb_id, err)
        return false
      })
    },
    getTrendingPoster: function(fanart) {
      // console.debug('fanart.getTrendingPoster', fanart);
      if (!fanart) {
        return null
      }
      if (!('tvposter' in fanart) && !('clearlogo' in fanart) && ('hdtvlogo' in fanart)) {
        var hdtvlogo = fanart.hdtvlogo[0] // default
        for (var i=0; i<fanart.hdtvlogo.length; i++) {
          if (fanart.hdtvlogo[i].lang == "en") {
              hdtvlogo = fanart.hdtvlogo[i]
              break
          }
        }
        return hdtvlogo.url.replace('/fanart', '/preview')
      }
      if (!('tvposter' in fanart) && ('clearlogo' in fanart)) {
        var clearlogo = fanart.clearlogo[0] // default
        for (var i=0; i<fanart.clearlogo.length; i++) {
          if (fanart.clearlogo[i].lang == "en") {
            clearlogo = fanart.clearlogo[i]
            break
          }
        }
        return clearlogo.url.replace('/fanart', '/preview')
      }
      if ('tvposter' in fanart) {
        var tvposter = fanart.tvposter[0] // default
        for (var i=0; i<fanart.tvposter.length; i++) {
          if (fanart.tvposter[i].lang == "en") {
            tvposter = fanart.tvposter[i]
            break
          }
        }
        return tvposter.url.replace('/fanart', '/preview')
      }
      return null
    },
    getSeasonPoster: function(seasonnumber, fanart) {
      // console.debug('fanart.getSeasonPoster', seasonnumber, fanart);
      if (!fanart) {
        return null
      }
      if (('seasonposter' in fanart)) {
        var hit = fanart.seasonposter.filter(function(image) {
          return parseInt(image.season) == parseInt(seasonnumber)
        })
        if (hit && hit.length > 0) {
          var seasonposter = hit[0] // default
          for (var i=0; i<hit.length; i++) {
            if (hit[i].lang == "en") {
              seasonposter = hit[i]
              break
            }
          }
          return seasonposter.url
        }
      }
      if (('tvposter' in fanart)) {
        var tvposter = fanart.tvposter[0] // default
        for (var i=0; i<fanart.tvposter.length; i++) {
          if (fanart.tvposter[i].lang == "en") {
            tvposter = fanart.tvposter[i]
            break
          }
        }
        return tvposter.url.replace('/fanart', '/preview')
      }
      return null
    },
    getEpisodePoster: function(fanart) {
      // console.debug('fanart.getEpisodePoster', fanart);
      if (!fanart) {
        return null
      }
      if (('tvthumb' in fanart)) {
        var tvthumb = fanart.tvthumb[0] // default
        for (var i=0; i<fanart.tvthumb.length; i++) {
          if (fanart.tvthumb[i].lang == "en") {
            tvthumb = fanart.tvthumb[i]
            break
          }
        }
        return tvthumb.url
      }
      if ('hdtvlogo' in fanart) {
        var hdtvlogo = fanart.hdtvlogo[0] // default
        for (var i=0; i<fanart.hdtvlogo.length; i++) {
          if (fanart.hdtvlogo[i].lang == "en") {
            hdtvlogo = fanart.hdtvlogo[i].url
            break
          }
        }
        return hdtvlogo.url
      }
      return null
    },
    /**
     * To populate fanart.cache
     */
    store: function() {
      var cache = {}
      CRUD.Find('Fanart', {}, {'limit': '0,99999'}).then(function(result) {
        result.map(function(fanart) {
          cache[fanart.TVDB_ID] = fanart.json
        })
        localStorage.setItem('fanart.cache', JSON.stringify(cache))
      })
    },
    /**
     * Populate fanart cache if there is none
     */
    initialize: function() {
      if (localStorage.getItem('fanart.cache')) {
        var cache = JSON.parse(localStorage.getItem('fanart.cache'))
        Object.keys(cache).map(function(tvdb_id) {
          storeInDB(cache[tvdb_id])
        })
        localStorage.removeItem('fanart.cache')
      }
      if (!localStorage.getItem('fanart.bootstrapped')) {
        $http.get('fanart.cache.json').then(function(result) {
          return Promise.all(Object.keys(result.data).map(function(tvdb_id) {
            return storeInDB(result.data[tvdb_id])
          }))
        }).then(function() {
          localStorage.setItem('fanart.bootstrapped', 1)
        })
      }
    }
  }
  return service
}
])

DuckieTV.run(['FanartService', function(FanartService) {
  FanartService.initialize()
}])
