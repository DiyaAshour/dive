export const dynamic="force-dynamic";

export async function GET(){
  return Response.json({
    openapi:"3.1.0",
    info:{
      title:"HandMeKey Connectivity API",
      version:"1.0.0",
      description:"Hotel PMS/CRS/channel-manager integration API for property metadata, ARI synchronization and reservation delivery.",
      contact:{email:"support@handmekey.com"},
    },
    servers:[{url:"https://handmekey.com",description:"Production"}],
    security:[{bearerAuth:[]}],
    paths:{
      "/api/v1/connectivity/health":{
        get:{summary:"Connectivity health check",operationId:"connectivityHealth",responses:{
          "200":{description:"Connection is authenticated and active",content:{"application/json":{schema:{$ref:"#/components/schemas/HealthEnvelope"}}}},
          "401":{$ref:"#/components/responses/Unauthorized"},
        }},
      },
      "/api/v1/connectivity/property":{
        get:{summary:"Get property, room and rate-plan mapping metadata",operationId:"getConnectivityProperty",responses:{
          "200":{description:"Property mapping metadata",content:{"application/json":{schema:{$ref:"#/components/schemas/PropertyEnvelope"}}}},
          "401":{$ref:"#/components/responses/Unauthorized"},
        }},
      },
      "/api/v1/connectivity/ari":{
        post:{summary:"Push rates, availability and restrictions",operationId:"pushAri",parameters:[{
          name:"x-idempotency-key",in:"header",required:false,description:"Stable unique key for this ARI batch. Reuse the same value when retrying the same logical request.",schema:{type:"string",maxLength:180},
        }],requestBody:{required:true,content:{"application/json":{schema:{$ref:"#/components/schemas/AriPush"}}}},responses:{
          "200":{description:"ARI batch accepted",content:{"application/json":{schema:{$ref:"#/components/schemas/AriEnvelope"}}}},
          "400":{$ref:"#/components/responses/BadRequest"},
          "401":{$ref:"#/components/responses/Unauthorized"},
        }},
      },
      "/api/v1/connectivity/reservations":{
        get:{summary:"List pending/delivered reservation events",operationId:"listReservationEvents",parameters:[{
          name:"limit",in:"query",required:false,schema:{type:"integer",minimum:1,maximum:100,default:50},
        }],responses:{
          "200":{description:"Reservation event feed",content:{"application/json":{schema:{$ref:"#/components/schemas/ReservationFeedEnvelope"}}}},
          "401":{$ref:"#/components/responses/Unauthorized"},
        }},
      },
      "/api/v1/connectivity/reservations/{eventId}/ack":{
        post:{summary:"Acknowledge a reservation event",operationId:"acknowledgeReservationEvent",parameters:[{
          name:"eventId",in:"path",required:true,schema:{type:"string"},
        }],responses:{
          "200":{description:"Event acknowledged",content:{"application/json":{schema:{$ref:"#/components/schemas/AckEnvelope"}}}},
          "401":{$ref:"#/components/responses/Unauthorized"},
          "404":{$ref:"#/components/responses/NotFound"},
        }},
      },
    },
    components:{
      securitySchemes:{bearerAuth:{type:"http",scheme:"bearer",bearerFormat:"HandMeKey API key"}},
      responses:{
        Unauthorized:{description:"Missing or invalid property API key",content:{"application/json":{schema:{$ref:"#/components/schemas/ErrorEnvelope"}}}},
        BadRequest:{description:"Request validation failed",content:{"application/json":{schema:{$ref:"#/components/schemas/ErrorEnvelope"}}}},
        NotFound:{description:"Resource not found",content:{"application/json":{schema:{$ref:"#/components/schemas/ErrorEnvelope"}}}},
      },
      schemas:{
        Error:{type:"object",required:["code","message"],properties:{code:{type:"string"},message:{type:"string"}}},
        ErrorEnvelope:{type:"object",required:["data","error"],properties:{data:{type:"null"},error:{$ref:"#/components/schemas/Error"}}},
        HealthEnvelope:{type:"object",required:["data","error"],properties:{data:{type:"object",required:["ok","hotelId","environment","serverTime","version"],properties:{ok:{type:"boolean",const:true},hotelId:{type:"string"},environment:{type:"string",enum:["UAT","PRODUCTION"]},serverTime:{type:"string",format:"date-time"},version:{type:"string"}}},error:{type:"null"}}},
        RatePlan:{type:"object",properties:{id:{type:"string"},name:{type:"string"},code:{type:"string"},externalCode:{type:["string","null"]},refundable:{type:"boolean"},mealPlan:{type:"string"}}},
        Room:{type:"object",properties:{id:{type:"string"},name:{type:"string"},code:{type:"string"},externalCode:{type:["string","null"]},quantity:{type:"integer"},maxGuests:{type:"integer"},maxAdults:{type:"integer"},maxChildren:{type:"integer"},ratePlans:{type:"array",items:{$ref:"#/components/schemas/RatePlan"}}}},
        PropertyEnvelope:{type:"object",required:["data","error"],properties:{data:{type:"object",properties:{hotel:{type:"object",properties:{id:{type:"string"},name:{type:"string"},slug:{type:"string"},city:{type:"string"},countryCode:{type:"string"},currency:{type:"string"},status:{type:"string"},verified:{type:"boolean"}}},rooms:{type:"array",items:{$ref:"#/components/schemas/Room"}},capabilities:{type:"object",additionalProperties:true}}},error:{type:"null"}}},
        AriUpdate:{type:"object",required:["roomCode","date"],properties:{roomCode:{type:"string"},ratePlanCode:{type:["string","null"]},date:{type:"string",format:"date"},rate:{type:"number",minimum:0},available:{type:"integer",minimum:0},overbookingLimit:{type:"integer",minimum:0},minStay:{type:"integer",minimum:1},maxStay:{type:["integer","null"],minimum:1},minAdvanceBookingDays:{type:"integer",minimum:0},maxAdvanceBookingDays:{type:["integer","null"],minimum:0},closedToArrival:{type:"boolean"},closedToDeparture:{type:"boolean"},closed:{type:"boolean"},stopSell:{type:"boolean"}}},
        AriPush:{type:"object",required:["updates"],properties:{updates:{type:"array",minItems:1,maxItems:500,items:{$ref:"#/components/schemas/AriUpdate"}}}},
        AriEnvelope:{type:"object",required:["data","error"],properties:{data:{type:"object",properties:{accepted:{type:"boolean"},reused:{type:"boolean"},eventId:{type:"string"},updatedDays:{type:"integer"}}},error:{type:"null"}}},
        ReservationEvent:{type:"object",properties:{id:{type:"string"},type:{type:"string",enum:["reservation.created","reservation.modified","reservation.cancelled"]},externalId:{type:["string","null"]},status:{type:"string",enum:["PENDING","DELIVERED","FAILED"]},attempts:{type:"integer"},createdAt:{type:"string",format:"date-time"},payload:{type:"object",additionalProperties:true}}},
        ReservationFeedEnvelope:{type:"object",required:["data","error"],properties:{data:{type:"object",properties:{events:{type:"array",items:{$ref:"#/components/schemas/ReservationEvent"}},hasMore:{type:"boolean"}}},error:{type:"null"}}},
        AckEnvelope:{type:"object",required:["data","error"],properties:{data:{type:"object",properties:{acknowledged:{type:"boolean",const:true},eventId:{type:"string"}}},error:{type:"null"}}},
      },
    },
  },{headers:{"cache-control":"public, max-age=300, stale-while-revalidate=3600"}});
}
