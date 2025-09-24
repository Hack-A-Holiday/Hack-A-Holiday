# 🛫 Kiwi.com Flight API Setup Guide

## 🎯 **Perfect for Flight Price Tracking!**

The Kiwi.com API you found is **excellent** for flight price tracking and detailed flight information. It provides:

- ✅ **Real-time flight prices**
- ✅ **Detailed flight information** (airlines, routes, stops)
- ✅ **Price tracking capabilities**
- ✅ **Multiple airlines and routes**
- ✅ **Advanced filtering options**
- ✅ **Baggage information**
- ✅ **Refundable/changeable options**

## 🚀 **Quick Setup (2 minutes)**

### **Step 1: Subscribe to Kiwi.com API**
1. **Visit**: https://rapidapi.com/kiwi-com/api/kiwi-com-cheap-flights
2. **Click**: "Subscribe to Test"
3. **Choose**: "Basic" plan (usually free)
4. **Confirm**: Your existing key will work immediately!

### **Step 2: Test Your API**
```bash
# Your RapidAPI key is already set
export RAPIDAPI_KEY="dc260b79a1mshf60901d122bb384p183ba0jsn9093522cbb9b"

# Test the API
curl --request GET \
  --url 'https://kiwi-com-cheap-flights.p.rapidapi.com/round-trip?source=City%3AJFK&destination=City%3ACDG&currency=usd&locale=en&adults=1&children=0&infants=0&handbags=1&holdbags=0&cabinClass=ECONOMY&sortBy=QUALITY&sortOrder=ASCENDING&limit=5' \
  --header 'x-rapidapi-host: kiwi-com-cheap-flights.p.rapidapi.com' \
  --header "x-rapidapi-key: $RAPIDAPI_KEY"
```

### **Step 3: Deploy Backend**
```bash
npm run deploy --prefix infrastructure
```

## 📊 **What You'll Get with Kiwi API**

### **Real Flight Data:**
- **Actual flight prices** (not random mock data)
- **Real airline schedules** and flight numbers
- **Live availability** and booking options
- **Current promotions** and deals
- **Detailed route information** (stops, connections)
- **Baggage policies** and costs

### **Advanced Features:**
- **Price tracking** over time
- **Multiple airlines** comparison
- **Flexible date searches**
- **Cabin class options**
- **Baggage preferences**
- **Refundable/changeable** options

## 🔧 **API Parameters Explained**

Your API call includes these powerful parameters:

```bash
source=City%3AJFK                    # Origin airport
destination=City%3ACDG               # Destination airport
currency=usd                         # Currency for pricing
locale=en                           # Language
adults=1                            # Number of adult passengers
children=0                          # Number of child passengers
infants=0                           # Number of infant passengers
handbags=1                          # Carry-on bags
holdbags=0                          # Checked bags
cabinClass=ECONOMY                  # Cabin class
sortBy=QUALITY                      # Sort by quality/price
sortOrder=ASCENDING                 # Sort order
limit=20                            # Number of results
```

## 🎯 **Why Kiwi API is Perfect**

### **Comprehensive Data:**
- **Flight details**: Airlines, flight numbers, schedules
- **Pricing**: Real-time prices with currency options
- **Routes**: Direct flights, connections, stops
- **Baggage**: Carry-on and checked bag information
- **Policies**: Refundable, changeable options

### **Advanced Search:**
- **Flexible dates**: Search across multiple days
- **Multiple airlines**: Compare different carriers
- **Price tracking**: Monitor price changes
- **Route optimization**: Find best connections

## 🚀 **After Subscription**

Once you subscribe to the Kiwi API:

1. **Real flight data** will replace mock data
2. **Live pricing** will show actual costs
3. **Flight tracking** will work with real schedules
4. **Price alerts** can be implemented
5. **Booking integration** becomes possible

## 💡 **Pro Tips**

- **Start with Basic plan**: Usually free with good limits
- **Use price tracking**: Monitor price changes over time
- **Filter by quality**: Get best value flights
- **Check baggage policies**: Include costs in total price
- **Monitor availability**: Real-time seat availability

## 🎉 **Ready to Go!**

Your system is already configured to use the Kiwi API. Just:

1. **Subscribe** to the API (2 minutes)
2. **Deploy** the backend
3. **Test** with real flight data
4. **Enjoy** live flight prices and tracking!

**The Kiwi API will give you professional-grade flight search with real-time data!** 🚀✈️
