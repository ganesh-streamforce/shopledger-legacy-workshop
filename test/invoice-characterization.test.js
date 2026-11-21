'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var pricing = require('../lib/pricing');
var invoice = require('../lib/invoice');
var reports = require('../lib/reports');

test('invoice GST matches order pricing HSN slab', function () {
  var items = [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }];
  var orderTotals = pricing.computeTotals(items, '');
  var invoiceTotals = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.equal(orderTotals.tax, 5);
  assert.equal(orderTotals.total, 105);
  assert.equal(invoiceTotals.rows[0].gstPercent, 5);
  assert.equal(invoiceTotals.tax, orderTotals.tax);
  assert.equal(invoiceTotals.total, orderTotals.total);
});

test('invoice handles decimal gstRate the same way as order pricing', function () {
  var items = [{ id: 1, name: 'Rice', hsn: '1006', gstRate: 0.05, price: 100, qty: 1 }];
  var orderTotals = pricing.computeTotals(items, '');
  var invoiceTotals = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.equal(orderTotals.tax, 5);
  assert.equal(invoiceTotals.rows[0].gstPercent, 5);
  assert.equal(invoiceTotals.tax, orderTotals.tax);
});

test('invoice coupon discount and total match order pricing', function () {
  var items = [{ id: 1, name: 'Coffee', hsn: '0901', price: 1000, qty: 1 }];
  var orderTotals = pricing.computeTotals(items, 'WELCOME');
  var invoiceTotals = invoice.computeInvoiceFigures({ items: items, coupon: 'WELCOME' });

  assert.equal(orderTotals.discount, 50);
  assert.equal(invoiceTotals.discount, orderTotals.discount);
  assert.equal(invoiceTotals.total, orderTotals.total);
});

test('invoice line GST is calculated after the order coupon allocation', function () {
  var items = [{ id: 1, name: 'Coffee', hsn: '0901', gstRate: 18, price: 1000, qty: 1 }];
  var orderTotals = pricing.computeTotals(items, 'WELCOME');
  var invoiceTotals = invoice.computeInvoiceFigures({ items: items, coupon: 'WELCOME' });

  assert.equal(orderTotals.tax, 171);
  assert.equal(invoiceTotals.tax, orderTotals.tax);
  assert.equal(invoiceTotals.rows[0].lineTax, orderTotals.lines[0].tax);
});

test('GST reconciliation matches an order created with order pricing', function () {
  var items = [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }];
  var orderTotals = pricing.computeTotals(items, '');
  var db = {
    orders: [{
      id: 42,
      date: '2026-11-21',
      customer: 'Test Customer',
      items: items,
      coupon: '',
      subtotal: orderTotals.subtotal,
      discount: orderTotals.discount,
      tax: orderTotals.tax,
      total: orderTotals.total
    }]
  };
  var result = reports.getGstReconciliation(db);

  assert.equal(result.totalChecked, 1);
  assert.equal(result.mismatchCount, 0);
  assert.equal(result.totalDelta, 0);
  assert.equal(result.rows[0].ledgerTax, 5);
  assert.equal(result.rows[0].invoiceTax, 5);
  assert.equal(result.rows[0].delta, 0);
  assert.equal(result.rows[0].matched, true);
});
