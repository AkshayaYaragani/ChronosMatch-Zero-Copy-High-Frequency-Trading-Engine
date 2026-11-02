from orderbook import OrderBook


class MatchingEngine:
    """Match buy and sell orders using price-time priority."""

    def __init__(self):
        self.order_book = OrderBook()
        self.trades = []

    def submit_order(self, side, order_id, price, quantity):
        if side not in ("buy", "sell"):
            raise ValueError("Side must be 'buy' or 'sell'.")

        if price <= 0 or quantity <= 0:
            raise ValueError("Price and quantity must be positive.")

        if side == "buy":
            self.order_book.add_buy_order(order_id, price, quantity)
        else:
            self.order_book.add_sell_order(order_id, price, quantity)

        self.match_orders()

    def match_orders(self):
        buy_orders = self.order_book.buy_orders
        sell_orders = self.order_book.sell_orders

        while buy_orders and sell_orders:
            best_buy = buy_orders[0]
            best_sell = sell_orders[0]

            # A trade is possible when the best bid meets the best ask.
            if best_buy["price"] < best_sell["price"]:
                break

            traded_quantity = min(
                best_buy["quantity"],
                best_sell["quantity"]
            )
            trade_price = best_sell["price"]

            trade = {
                "buy_order_id": best_buy["order_id"],
                "sell_order_id": best_sell["order_id"],
                "price": trade_price,
                "quantity": traded_quantity
            }
            self.trades.append(trade)

            best_buy["quantity"] -= traded_quantity
            best_sell["quantity"] -= traded_quantity

            if best_buy["quantity"] == 0:
                buy_orders.pop(0)

            if best_sell["quantity"] == 0:
                sell_orders.pop(0)

            print("Trade executed:", trade)

    def display_trades(self):
        print("\nEXECUTED TRADES:")
        if not self.trades:
            print("No trades executed yet.")
            return

        for trade in self.trades:
            print(trade)


if __name__ == "__main__":
    engine = MatchingEngine()

    engine.submit_order("sell", "S101", 100, 10)
    engine.submit_order("buy", "B101", 105, 6)
    engine.submit_order("buy", "B102", 100, 8)

    engine.display_trades()
    engine.order_book.display_orders()
