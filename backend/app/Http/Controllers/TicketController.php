<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    private function formatTicket($t)
    {
        return [
            'id' => $t->ticket_code ?: (string)$t->id,
            'db_id' => $t->id,
            'ticket_code' => $t->ticket_code,
            'user_id' => $t->user_id,
            'category' => $t->category,
            'priority' => $t->priority,
            'msg' => $t->msg,
            'status' => $t->status,
            'time' => $t->time ?: ($t->created_at ? ($t->created_at instanceof \DateTimeInterface ? $t->created_at->format('d/m/Y H:i') . ' WIB' : (string)$t->created_at) : null),
            'solution' => $t->solution,
            'senderName' => $t->sender_name,
            'sender_name' => $t->sender_name,
            'senderRole' => $t->sender_role,
            'sender_role' => $t->sender_role,
            'repliedAt' => $t->replied_at,
            'replied_at' => $t->replied_at,
            'created_at' => $t->created_at,
        ];
    }

    public function index()
    {
        $tickets = Ticket::orderBy('id', 'desc')->get();
        return response()->json($tickets->map(fn($t) => $this->formatTicket($t)));
    }

    public function show($id)
    {
        $t = Ticket::where('id', $id)->orWhere('ticket_code', $id)->firstOrFail();
        return response()->json($this->formatTicket($t));
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $code = $data['id'] ?? $data['ticket_code'] ?? ('INC-' . rand(100, 999));

        $ticket = Ticket::create([
            'ticket_code' => $code,
            'user_id' => $data['user_id'] ?? null,
            'category' => $data['category'] ?? 'Lainnya',
            'priority' => $data['priority'] ?? 'Normal',
            'msg' => $data['msg'] ?? ($data['description'] ?? ''),
            'status' => $data['status'] ?? 'Proses',
            'time' => $data['time'] ?? now()->format('d/m/Y H:i') . ' WIB',
            'solution' => $data['solution'] ?? 'Sedang ditinjau oleh Tim Panitia Pusat',
            'sender_name' => $data['senderName'] ?? $data['sender_name'] ?? 'Pengguna',
            'sender_role' => $data['senderRole'] ?? $data['sender_role'] ?? 'participant',
        ]);

        return response()->json($this->formatTicket($ticket), 201);
    }

    public function update(Request $request, $id)
    {
        $t = Ticket::where('id', $id)->orWhere('ticket_code', $id)->firstOrFail();
        $data = $request->all();

        $t->update([
            'status' => $data['status'] ?? $t->status,
            'solution' => $data['solution'] ?? $t->solution,
            'replied_at' => $data['repliedAt'] ?? $data['replied_at'] ?? now()->format('H:i') . ' WIB',
        ]);

        return response()->json($this->formatTicket($t));
    }

    public function destroy($id)
    {
        $t = Ticket::where('id', $id)->orWhere('ticket_code', $id)->firstOrFail();
        $t->delete();
        return response()->json(['message' => 'Ticket deleted successfully'], 200);
    }
}