"""Initial migration

Revision ID: 0ae7c6324f88
Revises: 
Create Date: 2024-07-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0ae7c6324f88'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'settings' not in tables:
        op.create_table('settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('site_name', sa.String(length=100), nullable=False),
        sa.Column('contact_email', sa.String(length=120), nullable=False),
        sa.Column('testimonial_approval_required', sa.Boolean(), nullable=False),
        sa.Column('summary_prompt', sa.Text(), nullable=False),
        sa.Column('follow_up_prompt', sa.Text(), nullable=False),
        sa.Column('sentiment_prompt', sa.Text(), nullable=False),
        sa.Column('snippet_prompt', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('id')
        )
    else:
        existing_columns = [c['name'] for c in inspector.get_columns('settings')]
        with op.batch_alter_table('settings', schema=None) as batch_op:
            if 'summary_prompt' not in existing_columns:
                batch_op.add_column(sa.Column('summary_prompt', sa.Text(), nullable=True))
            if 'follow_up_prompt' not in existing_columns:
                batch_op.add_column(sa.Column('follow_up_prompt', sa.Text(), nullable=True))
            if 'sentiment_prompt' not in existing_columns:
                batch_op.add_column(sa.Column('sentiment_prompt', sa.Text(), nullable=True))
            if 'snippet_prompt' not in existing_columns:
                batch_op.add_column(sa.Column('snippet_prompt', sa.Text(), nullable=True))

        # Now update the columns with default values
        op.execute("UPDATE settings SET summary_prompt = 'Summarize the testimonial.' WHERE summary_prompt IS NULL")
        op.execute("UPDATE settings SET follow_up_prompt = 'Generate a follow-up question.' WHERE follow_up_prompt IS NULL")
        op.execute("UPDATE settings SET sentiment_prompt = 'Analyze the sentiment.' WHERE sentiment_prompt IS NULL")
        op.execute("UPDATE settings SET snippet_prompt = 'Extract snippets.' WHERE snippet_prompt IS NULL")

        # Now make the columns non-nullable
        with op.batch_alter_table('settings', schema=None) as batch_op:
            batch_op.alter_column('summary_prompt', nullable=False)
            batch_op.alter_column('follow_up_prompt', nullable=False)
            batch_op.alter_column('sentiment_prompt', nullable=False)
            batch_op.alter_column('snippet_prompt', nullable=False)

def downgrade():
    op.drop_table('settings')