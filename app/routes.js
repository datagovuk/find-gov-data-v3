var express = require('express')
var router = express.Router()
var data = require('./data.js')
var elasticsearch = require('elasticsearch')

const esClient = new elasticsearch.Client({
  host: process.env.ES_HOSTS,
//  log: 'trace'
})

// Deliver all the data to every template
router.use(function(req,res,next){
  res.locals.data = data
  next()
})

// Route index page
router.get('/', function (req, res) {
  res.render('index')
})

router.use(function(req,res,next){
  res.locals.data = data
  next()
})

const monthNames =  {'01': 'January', '02': 'February', '03': 'March', '04': 'April', '05': 'May', '06': 'June', '07': 'July', '08': 'August', '09': 'September', '10': 'October', '11': 'November', '12': 'December'};
const processEsResponse = results =>
  results.hits.hits
    .map(result => {
      var newResult = result._source
      const day = newResult.last_edit_date.substr(8,2)
      const month = monthNames[newResult.last_edit_date.substr(5,2)]
      const year = newResult.last_edit_date.substr(0,4)
      newResult.location = [ newResult.location1, newResult.location2, newResult.location3]
        .filter(loc => loc)
        .join(',')
      newResult.last_updated = day + ' ' + month + ' ' + year
      newResult.next_updated = UpdateDate(newResult.update_frequency, day, newResult.last_edit_date.substr(5,2), year )
      return newResult
    })


// Calculates the expected update date, based on frequency selected and the last time the dataset
// was updated. Doesn't yet handle weekly updates.

function UpdateDate(frequency, day, month, year){
  var yearWords = ['annual','annually', 'yearly', 'year']
  var quarterlyWords = ['quarterly', 'quarter', 'four months', '4 months']
  var monthlyWords = ['monthly', 'month']
  var int_year = Number(year)
  var int_month = Number(month)
  var updatedMonth
  var updatedYear
  var nextUpdated = day + ' ' + updatedMonth + ' ' + updatedYear

  function monthUpdates(int_month, frequency) {
    if (int_month + frequency > 12) {
      updatedYear = int_year + 1
      updatedMonth = `0${(int_month + frequency)% 12}`
      nextUpdated = day + ' ' + monthNames[updatedMonth] + ' ' + updatedYear
    } else if (int_month + frequency == 12) {
      nextUpdated = day + ' ' + monthNames['12'] + ' ' + year
    } else {
      updatedMonth = `0${(int_month + frequency)}`
      nextUpdated = day + ' ' + monthNames[updatedMonth] + ' ' + year
    }
    return nextUpdated
  }

  if (yearWords.includes(frequency.toLowerCase())) {
    updatedYear = int_year + 1
    nextUpdated = day + ' ' + monthNames[month] + ' ' + updatedYear
  } else if (quarterlyWords.includes(frequency.toLowerCase())) {
    monthUpdates(int_month, 4)
  } else if (monthlyWords.includes(frequency.toLowerCase())) {
    monthUpdates(int_month, 1)
  } else {
    nextUpdated = ''
  }
  return nextUpdated
}



router.get('/search-results', function(req, res, next) {
  const query = req.query.q
  const location = req.query['location']
  const page = req.query.page || 1
  orgTypes = req.query['org-type'] || ''

  // Remove extraneous org-type=_unchecked that appears due to prototype-kit
  // issue.  We don't want it....
  if (orgTypes && Array.isArray(orgTypes)) {
    orgTypes = orgTypes.filter((item)=>{return item != '_unchecked'})
  }

  // Copy the query because we don't want to provide a potentially modified
  // version back to the template.
  var query_string = query
  var sortBy = req.query['sortby']
  var limit = 10
  var offset = (page * limit) - limit

  if (location) {
    query_string += " " + location
    query_string = query_string.trim()
  }

  // If there is no query string, we will default to showing the most recent
  // datasets as we can't have relevance when there is nothing to check
  // relevance against. At the same time, we want to match everything if the
  // user has provided no terms so we will search for *
  if (query_string == ""){
    sortBy = 'recent'
    query_string = "*"
  }

  // TODO: When we have an organisation_type to filter on, we will need to change
  // the query_string to append " organisation_type:X" where X is the short
  // name of the organisation. We don't yet have this info in the search index.


  var esQuery = {
    index: process.env.ES_INDEX,
    body: {
      query: {
        query_string: {
          query: query_string,
          fields: [
                   "summary^2", "title^3", "description^1",
                   "location1^2", "location2^2", "location3^2",
                   "_all"
                  ],
          default_operator: "and"
        }
      },
      from: offset,
      size: limit
    }
  }

  // Set the sort field if the user has selected one in the UI, otherwise
  // we will default to relevance (using _score).  We don't have popularity
  // scores yet, so we'll cheat and use the name of the dataset
  switch(sortBy) {
      case "recent":
          esQuery.sort = "last_edit_date:desc"
          break;
      case "viewed":
          esQuery.sort = "name:asc"
          break;
  }


  esClient.search(esQuery, (esError, esResponse) => {
    if (esError) {
      throw esError
    } else {

      var total_results = esResponse.hits.total
      var page_count = Math.ceil(total_results / 10)

      res.render('search-results', {
        central: orgTypes.indexOf('central-gov') !== -1,
        local: orgTypes.indexOf('local-auth') !== -1,
        bodies: orgTypes.indexOf('bodies') !== -1,
        query: query,
        orgTypes: orgTypes,
        sortBy: ['best', 'recent', 'viewed'].indexOf(sortBy) !== -1 ? sortBy : '',
        location: location,
        locations: data.locations,
        results: processEsResponse(esResponse),
        numResults: total_results,
        pageCount: page_count,
        currentPage: page
      })
    }
  })
})


/*
 * Return a collection of n datasets, similar to the one provided
 */
const get_more_like_this = (dataset, n) => {
  var like = dataset.title + " " +
             dataset.summary + " " +
             dataset.notes + " " +
             dataset.organisation_name;

  const esQuery = {
    index: process.env.ES_INDEX,
    body: {
      query: {
        more_like_this: {
          fields : ["title^3", "summary^3", "notes", "organisation_name^2"],
          like : like,
          min_term_freq : 4,
          max_query_terms : 12
        }
      }
    }
  }

  return new Promise((resolve, reject) => {
    esClient.search(esQuery, (esError, results) => {
      var matches = results.hits.hits
        .filter(item=>{
          return item._score > 0.65 && item._id != dataset.id
        })
        .map(item =>{
          return {
            name: item._source.name,
            title: item._source.title,
            summary: item._source.summary,
          }
        })
        .slice(0, n)
        resolve(matches)
    })
  })
}

router.get('/datasets/:name', function(req, res, next) {
  const esQuery = {
    index: process.env.ES_INDEX,
    body: {
      query: { term: { name : req.params.name } }
    }
  }

  esClient.search(esQuery, (esError, esResponse) => {
    var result = processEsResponse(esResponse)[0]
    const cmpStrings = (s1, s2) => s1 < s2 ? 1 : (s1 > s2 ? -1 : 0)

    const groupByDate = function(result){
      var groups = []


      result.resources.forEach(function(datafile){
        if (datafile['start_date']) {
          const yearArray = groups.filter(yearObj => yearObj.year == datafile['start_date'].substr(0,4))
          if (yearArray.length === 0) {
            var group = {'year': "", 'datafiles':[]}
            group['year']= datafile['start_date'].substr(0,4)
            group['datafiles'].push(datafile)
            groups.push(group)
          } else {
            yearArray[0]['datafiles'].push(datafile)
          }
        }
      })
      return groups
        .map(group=> {
          var newGroup = group
          newGroup.datafiles =
            group.datafiles.sort((g1, g2) => cmpStrings(g1.start_date, g2.start_date))
          return newGroup;
        })
        .sort((g1, g2) => cmpStrings(g1.year, g2.year))
    }

    if (esError) {
      throw esError
    } else {
      get_more_like_this(result, 3)
        .then( matches => {
          res.render('dataset', {
            result: result,
            related_datasets: matches,
            groups: groupByDate(result)
          })
        })
     }
  })
})

module.exports = router
